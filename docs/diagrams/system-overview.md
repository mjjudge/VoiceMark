# VoiceMark System Overview

This diagram shows the high-level architecture of VoiceMark.

```mermaid
graph TB
    subgraph "User Interface Layer"
        UI[Main Application Window]
        Editor[Markdown Editor]
        Browser[Note Browser]
    end
    
    subgraph "Voice Processing Layer"
        Mic[Microphone Input]
        VAD[Voice Activity Detection]
        SR[Speech Recognition Engine]
        CMD[Command Processor]
    end
    
    subgraph "Core Logic Layer"
        NM[Note Manager]
        FM[File Manager]
        CM[Configuration Manager]
    end
    
    subgraph "Storage Layer"
        FS[File System]
        Notes[(Markdown Files)]
        Config[(Configuration)]
    end
    
    UI --> Editor
    UI --> Browser
    UI --> Mic
    
    Mic --> VAD
    VAD --> SR
    SR --> CMD
    
    CMD --> NM
    Editor --> NM
    Browser --> NM
    
    NM --> FM
    NM --> CM
    
    FM --> FS
    CM --> FS
    FS --> Notes
    FS --> Config
    
    style UI fill:#4a90e2
    style SR fill:#50c878
    style NM fill:#ff6b6b
    style FS fill:#f7b731
```

## Components

### User Interface Layer

- **Main Application Window**: Primary application window with menu and controls
- **Markdown Editor**: Text editor with Markdown support and live preview
- **Note Browser**: File browser for navigating and managing notes

### Voice Processing Layer

- **Microphone Input**: Captures audio from the user's microphone
- **Voice Activity Detection**: Detects when the user is speaking vs silence
- **Speech Recognition Engine**: Converts speech to text (Vosk/Whisper)
- **Command Processor**: Interprets voice commands (e.g., "VoiceMark, save")

### Core Logic Layer

- **Note Manager**: Handles note creation, editing, and organization
- **File Manager**: Manages file I/O operations
- **Configuration Manager**: Handles application settings and preferences

### Storage Layer

- **File System**: Direct interaction with the OS file system
- **Markdown Files**: Notes stored as `.md` files
- **Configuration**: Application settings and user preferences

## Data Flow

### Dictation Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant VAD
    participant SR
    participant NM
    participant FS
    
    User->>UI: "VoiceMark, start"
    UI->>VAD: Activate listening
    VAD->>SR: Audio stream
    SR->>NM: Transcribed text
    NM->>UI: Update editor
    User->>UI: "Voice Mark, save"
    UI->>NM: Save command
    NM->>FS: Write file
    FS-->>UI: Confirmation
    UI-->>User: "Note saved"
```

### Note Management Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant Browser
    participant NM
    participant FS
    
    User->>UI: Open note browser
    UI->>Browser: Show browser
    Browser->>NM: List notes
    NM->>FS: Scan directory
    FS-->>NM: File list
    NM-->>Browser: Note metadata
    Browser-->>User: Display notes
    User->>Browser: Select note
    Browser->>NM: Load note
    NM->>FS: Read file
    FS-->>NM: File content
    NM-->>UI: Display in editor
```

## Technology Stack

- **UI Framework**: Electron or Tauri (to be decided)
- **Speech Recognition**: Vosk or Whisper (offline)
- **Editor**: CodeMirror 6 or Monaco Editor
- **Storage**: Direct file system access (no database)
- **Configuration**: JSON or YAML files

## Key Design Decisions

1. **Offline-First**: All processing happens locally
2. **File-Based**: No database, direct file system access
3. **Markdown Native**: Native support for Markdown format
4. **Privacy-Focused**: No data leaves the user's machine

## Related Documentation

- [ADR-002: Offline-First Architecture](../decisions/ADR-002-offline-first-architecture.md)
- [ADR-003: Markdown Storage](../decisions/ADR-003-markdown-storage.md)
- [v0.1 UI Specification](../../specs/v0.1-ui-spec.md)
