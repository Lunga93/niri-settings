---
tags: [execution-flow, diagrams]
---

# 02 Execution Flow

## 1. App startup

```mermaid
sequenceDiagram
    autonumber
    participant T as Tauri runtime (Rust)
    participant V as Vite dev server :1420
    participant R as React app
    participant S as Sidecar process (Go)
    participant F as Filesystem

    T->>V: WebView loads http://localhost:1420
    V->>R: index.html → main.tsx
    R->>R: ErrorBoundary wraps SettingsLoader (App.tsx)
    R->>R: useEffect fires loadSettingsAtom (stores/settings.ts)
    R->>T: invoke("sidecar_command", read_settings)
    T->>S: spawn sidecar, write JSON to stdin
    S->>F: read ~/.config/dotfiles/settings.json
    F-->>S: file contents (or "{}" when missing)
    S-->>T: {ok:true, data:"{…}"} on stdout, exit
    T-->>R: data string
    R->>R: JSON.parse → SettingsDataSchema.safeParse → set(settingsAtom)
```

Startup is failure-tolerant: if settings are unreadable or fail zod validation, `readSettings` returns `null` and defaults stay in place.

## 2. Settings change pipeline

```mermaid
flowchart TD
    A["User interacts with a control"] --> B["Write-atom called<br/>(stores/<domain>.ts)"]
    B --> C["set(settingsAtom, next)"]
    C --> D["React re-render (instant UI)"]
    B --> E["writeSettings(next)<br/>fire-and-forget"]
    B --> F["triggerSideEffects(section)"]
    E --> G["invokeRaw write_settings"]
    G --> H["Rust spawns Go sidecar"]
    H --> I["handleWriteSettings:<br/>write settings.json"]
    I --> J["auto: ReloadQuickshell"]
    F --> K{"section?"}
    K -- display --> L["execScript apply-display-scale"]
    K -- icons --> M["gsettings icon-theme"]
    K -- appearance --> N["execScript apply-theme"]
```

Key: optimistic UI, persistence via write-atoms, side effects keyed by settings section.

## 3. Sidecar request lifecycle

```mermaid
sequenceDiagram
    autonumber
    participant TS as lib/ipc/client.ts
    participant RS as Rust sidecar_command
    participant GO as Go sidecar

    TS->>RS: invoke("sidecar_command", {command, args})
    RS->>RS: resolve sidecar binary path
    RS->>GO: spawn, stdin ← JSON, stdin closed
    GO->>GO: ReadAll(stdin) → switch(command)
    alt success
        GO-->>RS: stdout {"ok":true,"data":…}, exit 0
        RS-->>TS: Ok(data)
        TS->>TS: zod safeParse → typed result
    else handler error
        GO-->>RS: stdout {"ok":false,"error":{code,message}}
        RS-->>TS: Err(message)
    end
    TS->>TS: normalizeError → AppError{code,message,details}
```

## 4. Page navigation

No router library — `activePageAtom` + `PAGE_COMPONENTS` map in `AppLayout.tsx`.
