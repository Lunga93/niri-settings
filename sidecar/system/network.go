// Package system — host network status via nmcli/ip for the Network page.
package system

import (
	"encoding/json"
	"os/exec"
	"strings"

	"niri-settings-sidecar/protocol"
)

// NetworkInterface describes one host link and its live state.
type NetworkInterface struct {
	Name      string   `json:"name"`
	Kind      string   `json:"kind"` // ethernet | wifi | other
	Connected bool     `json:"connected"`
	State     string   `json:"state"`
	IPs       []string `json:"ips"`
}

// NetworkStatus is the payload returned by get_network_status.
type NetworkStatus struct {
	NmAvailable bool               `json:"nm_available"`
	Interfaces  []NetworkInterface `json:"interfaces"`
}

func kindOf(deviceType, name string) string {
	switch deviceType {
	case "ethernet":
		return "ethernet"
	case "wifi":
		return "wifi"
	default:
		switch {
		case strings.HasPrefix(name, "wl"):
			return "wifi"
		case strings.HasPrefix(name, "en"), strings.HasPrefix(name, "eth"):
			return "ethernet"
		default:
			return "other"
		}
	}
}

// parseNmcliStatus parses `nmcli -t -f DEVICE,TYPE,STATE device status`.
func parseNmcliStatus(out string) []NetworkInterface {
	var ifaces []NetworkInterface
	for _, line := range strings.Split(out, "\n") {
		line = strings.TrimRight(line, "\r")
		if line == "" {
			continue
		}
		parts := strings.Split(line, ":")
		if len(parts) < 3 {
			continue
		}
		name, devType, state := parts[0], parts[1], parts[2]
		iface := NetworkInterface{
			Name:      name,
			Kind:      kindOf(devType, name),
			State:     state,
			Connected: state == "connected",
		}
		ifaces = append(ifaces, iface)
	}
	return ifaces
}

// ipAddrEntry mirrors the subset of `ip -j addr show` we consume.
type ipAddrEntry struct {
	Ifname   string `json:"ifname"`
	AddrInfo []struct {
		Local string `json:"local"`
	} `json:"addr_info"`
}

// mergeIPs attaches non-loopback IPv4 addresses from `ip -j addr` output.
func mergeIPs(ifaces []NetworkInterface, ipJSON string) {
	var entries []ipAddrEntry
	if err := json.Unmarshal([]byte(ipJSON), &entries); err != nil {
		return
	}
	byName := make(map[string]int, len(ifaces))
	for i, iface := range ifaces {
		byName[iface.Name] = i
	}
	for _, entry := range entries {
		idx, ok := byName[entry.Ifname]
		if !ok {
			continue
		}
		for _, addr := range entry.AddrInfo {
			ip := addr.Local
			if ip == "" || strings.HasPrefix(ip, "127.") {
				continue
			}
			ifaces[idx].IPs = append(ifaces[idx].IPs, ip)
		}
	}
}

// GetNetworkStatus probes interface state; each source fails independently.
func GetNetworkStatus() NetworkStatus {
	status := NetworkStatus{Interfaces: []NetworkInterface{}}
	nmOut, err := exec.Command("nmcli", "-t", "-f", "DEVICE,TYPE,STATE", "device", "status").Output()
	if err == nil {
		status.NmAvailable = true
		status.Interfaces = parseNmcliStatus(string(nmOut))
	}

	ipOut, err := exec.Command("ip", "-j", "addr", "show").Output()
	if err == nil {
		if len(status.Interfaces) == 0 {
			// No NetworkManager: derive interfaces purely from ip output.
			status.Interfaces = interfacesFromIPJSON(string(ipOut))
		}
		mergeIPs(status.Interfaces, string(ipOut))
	}

	// Without NetworkManager, treat having a global IPv4 as connected.
	if !status.NmAvailable {
		for i := range status.Interfaces {
			if len(status.Interfaces[i].IPs) > 0 {
				status.Interfaces[i].Connected = true
				status.Interfaces[i].State = "connected"
			}
		}
	}

	status.Interfaces = filterVirtual(status.Interfaces)
	return status
}

// isVirtualInterface reports whether a link is container/loopback noise the
// UI should not list (docker bridges, veth pairs, loopback, libvirt).
func isVirtualInterface(name string) bool {
	for _, prefix := range []string{"lo", "docker", "br-", "veth", "virbr", "vnet"} {
		if strings.HasPrefix(name, prefix) {
			return true
		}
	}
	return false
}

func filterVirtual(ifaces []NetworkInterface) []NetworkInterface {
	out := make([]NetworkInterface, 0, len(ifaces))
	for _, iface := range ifaces {
		if !isVirtualInterface(iface.Name) {
			out = append(out, iface)
		}
	}
	return out
}

// interfacesFromIPJSON builds interface entries when nmcli is unavailable.
func interfacesFromIPJSON(ipJSON string) []NetworkInterface {
	var entries []ipAddrEntry
	if err := json.Unmarshal([]byte(ipJSON), &entries); err != nil {
		return []NetworkInterface{}
	}
	ifaces := make([]NetworkInterface, 0, len(entries))
	for _, entry := range entries {
		iface := NetworkInterface{
			Name:  entry.Ifname,
			Kind:  kindOf("", entry.Ifname),
			State: "unknown",
			IPs:   []string{},
		}
		for _, addr := range entry.AddrInfo {
			ip := addr.Local
			if ip == "" || strings.HasPrefix(ip, "127.") {
				continue
			}
			iface.IPs = append(iface.IPs, ip)
		}
		ifaces = append(ifaces, iface)
	}
	return ifaces
}

// HandleGetNetworkStatus responds with the current network snapshot.
func HandleGetNetworkStatus(_ map[string]any) {
	protocol.WriteResponse(GetNetworkStatus())
}
