import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const CloseRequestModal = ({ isOpen, onClose, onConfirm, onReject }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-40" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-bold leading-6 text-gray-900"
                >
                  Завершение запроса
                </Dialog.Title>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Пожалуйста, подтвердите, была ли ваша проблема решена. Это поможет нам вести статистику и улучшать сервис.
                  </p>
                </div>

                <div className="mt-6 space-y-4">
                  <button
                    type="button"
                    className="inline-flex w-full justify-center items-center gap-3 rounded-md border border-transparent bg-green-100 px-4 py-3 text-sm font-medium text-green-900 hover:bg-green-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={onConfirm}
                  >
                    <CheckCircleIcon className="h-6 w-6 text-green-600"/>
                    <span>Да, проблема решена</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex w-full justify-center items-center gap-3 rounded-md border border-transparent bg-red-100 px-4 py-3 text-sm font-medium text-red-900 hover:bg-red-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 transition-colors"
                    onClick={onReject}
                  >
                    <XCircleIcon className="h-6 w-6 text-red-600"/>
                    <span>Нет, проблема не решена</span>
                  </button>
                </div>
                
                 <div className="mt-5 text-center">
                    <button
                      type="button"
                      className="text-sm text-gray-500 hover:text-gray-700"
                      onClick={onClose}
                    >
                      Отмена
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

export default CloseRequestModal; 