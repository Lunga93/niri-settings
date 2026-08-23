package system

import (
	"reflect"
	"testing"
)

func TestParseNmcliStatus(t *testing.T) {
	out := "wlan0:wifi:connected\nenp3s0:ethernet:disconnected\nlo:loopback:unmanaged\n"
	ifaces := parseNmcliStatus(out)

	if len(ifaces) != 3 {
		t.Fatalf("expected 3 interfaces, got %d", len(ifaces))
	}
	wifi := ifaces[0]
	if wifi.Kind != "wifi" || !wifi.Connected || wifi.State != "connected" {
		t.Errorf("wifi parse wrong: %+v", wifi)
	}
	eth := ifaces[1]
	if eth.Kind != "ethernet" || eth.Connected {
		t.Errorf("ethernet parse wrong: %+v", eth)
	}
	if ifaces[2].Kind != "other" {
		t.Errorf("loopback kind wrong: %+v", ifaces[2])
	}
}

func TestMergeIPs(t *testing.T) {
	ifaces := []NetworkInterface{
		{Name: "wlan0", Kind: "wifi"},
		{Name: "enp3s0", Kind: "ethernet"},
	}
	ipJSON := `[{"ifname":"wlan0","addr_info":[{"local":"192.168.1.20"},{"local":"127.0.0.1"}]},
{"ifname":"enp3s0","addr_info":[{"local":"10.0.0.5"}]}]`

	mergeIPs(ifaces, ipJSON)

	if !reflect.DeepEqual(ifaces[0].IPs, []string{"192.168.1.20"}) {
		t.Errorf("wlan0 ips wrong: %v (loopback must be dropped)", ifaces[0].IPs)
	}
	if !reflect.DeepEqual(ifaces[1].IPs, []string{"10.0.0.5"}) {
		t.Errorf("enp3s0 ips wrong: %v", ifaces[1].IPs)
	}
}

func TestInterfacesFromIPJSON(t *testing.T) {
	ipJSON := `[{"ifname":"eth0","addr_info":[]},{"ifname":"wlp2s0","addr_info":[{"local":"10.1.2.3"}]}]`
	ifaces := interfacesFromIPJSON(ipJSON)

	if len(ifaces) != 2 {
		t.Fatalf("expected 2 interfaces, got %d", len(ifaces))
	}
	if ifaces[0].Kind != "ethernet" || ifaces[1].Kind != "wifi" {
		t.Errorf("prefix-based kinds wrong: %+v", ifaces)
	}
}

func TestFilterVirtual(t *testing.T) {
	ifaces := []NetworkInterface{
		{Name: "lo"},
		{Name: "docker0"},
		{Name: "br-2f7ecbe49f21"},
		{Name: "veth400ea42"},
		{Name: "enp5s0"},
		{Name: "wlan0"},
	}
	out := filterVirtual(ifaces)

	if len(out) != 2 || out[0].Name != "enp5s0" || out[1].Name != "wlan0" {
		t.Errorf("virtual filter wrong: %+v", out)
	}
}
