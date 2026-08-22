use serde::{Deserialize, Serialize};
use std::io::Write;
use tauri::command;

#[derive(Debug, Serialize, Deserialize)]
struct SidecarResponse {
    ok: bool,
    data: Option<serde_json::Value>,
    error: Option<SidecarError>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SidecarError {
    code: String,
    message: String,
    details: Option<serde_json::Value>,
}

#[command]
fn sidecar_command(
    command: String,
    args: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let request = serde_json::json!({
        "command": command,
        "args": args,
    });
    let input = serde_json::to_string(&request).map_err(|e| e.to_string())?;

    let sidecar_path = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("niri-settings-sidecar")))
        .unwrap_or_else(|| "niri-settings-sidecar".into());

    let mut child = std::process::Command::new(&sidecar_path)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar at {}: {e}", sidecar_path.display()))?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(input.as_bytes())
            .map_err(|e| format!("Failed to write to sidecar stdin: {e}"))?;
    }
    // stdin is dropped here, sending EOF to the Go process

    let result = child
        .wait_with_output()
        .map_err(|e| format!("Sidecar process error: {e}"))?;

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        return Err(format!(
            "Sidecar exited with status {}: {}",
            result.status, stderr
        ));
    }

    let stdout = String::from_utf8_lossy(&result.stdout);
    let response: SidecarResponse =
        serde_json::from_str(&stdout).map_err(|e| format!("Invalid sidecar JSON: {e}"))?;

    if response.ok {
        Ok(response.data.unwrap_or(serde_json::Value::Null))
    } else {
        Err(response
            .error
            .map(|e| e.message)
            .unwrap_or_else(|| "Unknown sidecar error".into()))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![sidecar_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
