use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::PathBuf;
use std::time::Instant;
use tauri::command;
use tauri::Manager;

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

fn resolve_sidecar_binary() -> PathBuf {
    let binary_name = "niri-settings-sidecar";

    // 1. Check directory of current executable (standard Tauri layout)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(parent) = exe_path.parent() {
            let candidate = parent.join(binary_name);
            if candidate.exists() {
                return candidate;
            }
            let candidate_binaries = parent.join("binaries").join(binary_name);
            if candidate_binaries.exists() {
                return candidate_binaries;
            }
        }
    }

    // 2. Check current working directory and relative build locations
    if let Ok(cwd) = std::env::current_dir() {
        let candidates = [
            cwd.join("src-tauri").join("target").join("debug").join(binary_name),
            cwd.join("src-tauri").join("target").join("release").join(binary_name),
            cwd.join("target").join("debug").join(binary_name),
            cwd.join("target").join("release").join(binary_name),
            cwd.join("binaries").join(binary_name),
            cwd.join("src-tauri").join("binaries").join(binary_name),
            cwd.join("sidecar").join(binary_name),
            cwd.join(binary_name),
        ];
        for candidate in candidates {
            if candidate.exists() {
                return candidate;
            }
        }
    }

    // 3. Fallback to binary name (relying on PATH)
    PathBuf::from(binary_name)
}

#[command]
fn sidecar_command(
    command: String,
    args: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let start_time = Instant::now();
    let request = serde_json::json!({
        "command": command,
        "args": args,
    });
    let input = serde_json::to_string(&request).map_err(|e| {
        let err_msg = format!("JSON serialization error for command '{command}': {e}");
        eprintln!("[tauri:sidecar] {err_msg}");
        err_msg
    })?;

    let sidecar_path = resolve_sidecar_binary();
    eprintln!(
        "[tauri:sidecar] Executing command '{command}' via '{}'",
        sidecar_path.display()
    );

    let mut child = std::process::Command::new(&sidecar_path)
        .stdin(std::process::Stdio::piped())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            let err_msg = format!(
                "Failed to spawn sidecar binary at '{}' for command '{command}': {e}",
                sidecar_path.display()
            );
            eprintln!("[tauri:sidecar] ERROR: {err_msg}");
            err_msg
        })?;

    if let Some(mut stdin) = child.stdin.take() {
        stdin.write_all(input.as_bytes()).map_err(|e| {
            let err_msg = format!("Failed to write to sidecar stdin for command '{command}': {e}");
            eprintln!("[tauri:sidecar] ERROR: {err_msg}");
            err_msg
        })?;
    }

    let result = child.wait_with_output().map_err(|e| {
        let err_msg = format!("Sidecar process error while waiting for command '{command}': {e}");
        eprintln!("[tauri:sidecar] ERROR: {err_msg}");
        err_msg
    })?;

    let elapsed = start_time.elapsed();

    if !result.status.success() {
        let stderr = String::from_utf8_lossy(&result.stderr);
        let err_msg = format!(
            "Sidecar process for command '{command}' exited with status {} in {}ms: {}",
            result.status,
            elapsed.as_millis(),
            stderr.trim()
        );
        eprintln!("[tauri:sidecar] ERROR: {err_msg}");
        return Err(err_msg);
    }

    if let Ok(stderr_str) = std::str::from_utf8(&result.stderr) {
        if !stderr_str.is_empty() {
            eprintln!("[sidecar:stderr] {}", stderr_str.trim());
        }
    }

    let response: SidecarResponse = serde_json::from_slice(&result.stdout).map_err(|e| {
        let preview = String::from_utf8_lossy(&result.stdout[..result.stdout.len().min(400)]);
        let err_msg = format!(
            "Invalid JSON returned from sidecar for command '{command}' in {}ms: {e}. Output was: {}",
            elapsed.as_millis(),
            preview.chars().take(200).collect::<String>()
        );
        eprintln!("[tauri:sidecar] ERROR: {err_msg}");
        err_msg
    })?;

    if response.ok {
        let data = response.data.unwrap_or(serde_json::Value::Null);
        // Compact per-command summaries so terminal logs actually explain
        // what the sidecar returned (payload itself is forwarded to JS).
        let summary = match command.as_str() {
            "ensure_wallpaper_thumbs" => data
                .get("generated")
                .and_then(|g| g.as_i64())
                .map(|g| format!("generated {}/{}", g, data.get("total").map(|t| t.to_string()).unwrap_or_else(|| "?".into())))
                .unwrap_or_default(),
            "get_wallpaper_info" => format!(
                "scanned {}, listed {}",
                data.get("total_scanned").and_then(|v| v.as_i64()).unwrap_or(-1),
                data.get("wallpapers").and_then(|v| v.as_array()).map(|a| a.len()).unwrap_or(0)
            ),
            _ => String::new(),
        };
        let size_kb = result.stdout.len() as f64 / 1024.0;
        let summary_suffix = if summary.is_empty() {
            format!("{:.1} kB out", size_kb)
        } else {
            format!("{} ({:.1} kB out)", summary, size_kb)
        };
        eprintln!(
            "[tauri:sidecar] Command '{command}' succeeded in {}ms: {}",
            elapsed.as_millis(),
            summary_suffix
        );
        Ok(data)
    } else {
        let err_msg = response
            .error
            .map(|e| format!("[{}] {}", e.code, e.message))
            .unwrap_or_else(|| "Unknown sidecar error".into());
        eprintln!(
            "[tauri:sidecar] Command '{command}' returned error in {}ms: {err_msg}",
            elapsed.as_millis()
        );
        Err(err_msg)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // The asset protocol scope in tauri.conf.json cannot expand $HOME,
            // so the wallpaper directories are allowed at runtime instead.
            if let Some(home) = std::env::var_os("HOME") {
                let home = PathBuf::from(home);
                let scope = app.asset_protocol_scope();
                let _ = scope.allow_directory(home.join("Pictures/wallpapers"), true);
                let _ = scope.allow_directory(home.join(".cache/dotfiles/thumbs"), true);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![sidecar_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
