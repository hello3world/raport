// Type definitions for File System Access API
interface FileSystemFileHandle {
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
}

interface FileSystemDirectoryHandle {
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    values(): AsyncIterableIterator<FileSystemHandle>;
    kind: 'file' | 'directory';
    name: string;
}

interface FileSystemWritableFileStream {
    write(contents: FileSystemWriteChunkType): Promise<void>;
    close(): Promise<void>;
}

type FileSystemWriteChunkType = BufferSource | Blob | string;

// Note: showDirectoryPicker does not accept suggestedName option
interface Window {
    showSaveFilePicker(options?: SaveFilePickerOptions): Promise<FileSystemFileHandle>;
    showOpenFilePicker(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
    showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>;
}

interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
}

interface OpenFilePickerOptions {
    multiple?: boolean;
    types?: FilePickerAcceptType[];
    excludeAcceptAllOption?: boolean;
}

interface DirectoryPickerOptions {
    mode?: 'read' | 'readwrite';
}

interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string | string[]>;
}