import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

const EditRequestModal = ({ isOpen, onClose, onConfirm, request, loading }) => {
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (request) {
      setDescription(request.description);
    }
  }, [request]);

  const handleConfirm = () => {
    onConfirm(description, reason);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* ... (Transition.Child for overlay) ... */}
        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child as={Fragment} enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
              <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900">Редактировать заявку</Dialog.Title>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">Описание заявки</label>
                    <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows="6" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"/>
                  </div>
                  <div>
                    <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Причина редактирования</label>
                    <input type="text" id="reason" value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"/>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-2">
                  <button type="button" className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={onClose}>Отмена</button>
                  <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300" onClick={handleConfirm} disabled={loading || !reason}>
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default EditRequestModal; 