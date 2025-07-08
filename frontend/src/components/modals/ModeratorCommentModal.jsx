import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import { PaperAirplaneIcon } from '@heroicons/react/24/outline';

const ModeratorCommentModal = ({ isOpen, onClose, onSubmit, title }) => {
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setComment('');
            setLoading(false);
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        setLoading(true);
        await onSubmit(comment);
        setLoading(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
                <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    rows="4"
                    placeholder="Оставьте комментарий (необязательно)..."
                    disabled={loading}
                />
                <div className="mt-4 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                    >
                        Отмена
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center gap-2"
                    >
                        {loading ? 'Отправка...' : 'Подтвердить'}
                        {!loading && <PaperAirplaneIcon className="h-5 w-5" />}
                    </button>
                </div>
            </motion.div>
        </Modal>
    );
};

export default ModeratorCommentModal; 