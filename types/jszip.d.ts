// Type definitions for JSZip
declare class JSZip {
    constructor();
    file(name: string, content: string | ArrayBuffer | Uint8Array | Blob): JSZip;
    generateAsync(options: { type: 'blob' }): Promise<Blob>;
    values(): AsyncIterableIterator<FileSystemDirectoryHandle | FileSystemFileHandle>;
}

interface Window {
    JSZip: typeof JSZip;
}