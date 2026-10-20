import { CircleX } from "lucide-react"
import type { UploadedFile } from "@/types"

const PDFsvg = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" className="h-10 w-10 flex-shrink-0" width="36" height="36" aria-hidden="true"><rect width="36" height="36" rx="6" fill="#FF5588"></rect><path d="M19.6663 9.66663H12.9997C12.5576 9.66663 12.1337 9.84222 11.8212 10.1548C11.5086 10.4673 11.333 10.8913 11.333 11.3333V24.6666C11.333 25.1087 11.5086 25.5326 11.8212 25.8451C12.1337 26.1577 12.5576 26.3333 12.9997 26.3333H22.9997C23.4417 26.3333 23.8656 26.1577 24.1782 25.8451C24.4907 25.5326 24.6663 25.1087 24.6663 24.6666V14.6666L19.6663 9.66663Z" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"></path><path d="M19.667 9.66663V14.6666H24.667" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"></path><path d="M21.3337 18.8334H14.667" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"></path><path d="M21.3337 22.1666H14.667" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"></path><path d="M16.3337 15.5H15.5003H14.667" stroke="white" strokeWidth="1.66667" strokeLinecap="round" strokeLinejoin="round"></path></svg>

function formatSize(sizeInBytes: number) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function truncate(name: string) {
    return name.length > 30 ? name.substring(0, 28) + '...' : name
}

function FileShow({ file, onRemove }: { file: UploadedFile, onRemove: (file: UploadedFile) => void }) {
    const uploading = file.pid === null
    const name = truncate(uploading ? "Uploading " + file.filename : file.filename)

    return (
        <div className="min-w-80 rounded-lg bg-gray-100 relative group h-full">
            {!uploading &&
                <button
                    type="button"
                    aria-label={`Remove ${file.filename}`}
                    onClick={() => onRemove(file)}
                    className="absolute z-20 -top-1 right-0 opacity-0 group-hover:opacity-100 focus:opacity-100"
                >
                    <CircleX className="bg-white rounded-3xl" size={25} strokeWidth={1} aria-hidden="true" />
                </button>}
            <div className="p-2 flex items-center">
                <div className="w-20">
                    <PDFsvg />
                </div>
                <div className="text-left -ml-6">
                    <h2 className="text-sm font-semibold" title={file.filename}>{name}</h2>
                    <p className="text-xs text-gray-500">{file.type.toUpperCase()} of {formatSize(file.size)}</p>
                </div>
            </div>
        </div>
    );
}

export default FileShow
