import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { ArrowUpTrayIcon, PaperClipIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MAX_FILE_SIZE_MB = 10;
const MAX_FILES_TOTAL = 10;
const DEFAULT_ACCEPT = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};
const DEFAULT_ACCEPT_LABEL = 'Разрешены: .pdf, .doc(x), .xls(x), .ppt(x), .txt, .jpg, .png, .gif, .webp';


const FileUploader = ({ 
    files, 
    setFiles, 
    maxFiles, 
    accept = DEFAULT_ACCEPT, 
    acceptLabel = DEFAULT_ACCEPT_LABEL 
}) => {
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    const availableSlots = maxFiles - files.length;
    const newFiles = acceptedFiles.slice(0, availableSlots);

    setFiles(prevFiles => [...prevFiles, ...newFiles]);

    if (rejectedFiles.length > 0) {
      const rejected = rejectedFiles[0];
      if (rejected.file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast.error(`Файл "${rejected.file.name}" слишком большой. Максимальный размер: ${MAX_FILE_SIZE_MB}МБ.`);
      } else {
        toast.error(`Файл "${rejected.file.name}" имеет недопустимый тип. Проверьте список разрешенных форматов.`);
      }
    }
    if (files.length + newFiles.length > maxFiles) {
      toast.warn(`Можно прикрепить не более ${MAX_FILES_TOTAL} файлов всего.`);
    }
  }, [files, maxFiles, setFiles]);

  const removeFile = (fileToRemove) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE_MB * 1024 * 1024,
    maxFiles: maxFiles,
    disabled: maxFiles <= 0,
    accept: accept
  });

  return (
    <div className="space-y-3">
      <div {...getRootProps()} className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors duration-200 ease-in-out ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'} ${maxFiles <= 0 ? 'cursor-not-allowed opacity-60' : ''}`}>
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center text-gray-500">
          <ArrowUpTrayIcon className="w-8 h-8 mx-auto text-gray-400" />
          {isDragActive ? (
            <p className="mt-2 text-indigo-600 font-semibold">Отпустите файлы здесь...</p>
          ) : (
            <p className="mt-2"><b>Нажмите чтобы выбрать</b> или перетащите файлы сюда</p>
          )}
          <p className="text-xs mt-1">
            Можно добавить еще: {maxFiles}
          </p>
          {acceptLabel && (
            <p className="text-xs text-gray-400 mt-2 px-4">
                {acceptLabel}
            </p>
          )}
        </div>
      </div>
      {files.length > 0 && (
        <div className="pt-2">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Новые файлы:</h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <PaperClipIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500 flex-shrink-0">
                    ({(file.size / 1024 / 1024).toFixed(2)} МБ)
                  </span>
                </div>
                <button
                  onClick={() => removeFile(file)}
                  className="p-1 rounded-full text-gray-400 hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader; 