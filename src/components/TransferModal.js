import React, { useState } from 'react';
import { Send, X, User, Key, AlertCircle, CheckCircle } from 'lucide-react';

function TransferModal({ isOpen, onClose, fileRecord, onTransfer }) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [transferMessage, setTransferMessage] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [error, setError] = useState('');

  const handleTransfer = async () => {
    if (!recipientAddress && !recipientEmail) {
      setError('Please enter recipient wallet address or email');
      return;
    }

    setIsTransferring(true);
    setError('');

    try {
      const transferData = {
        fileId: fileRecord.id,
        fileName: fileRecord.name,
        ipfsHash: fileRecord.ipfsHash,
        encryptionKey: fileRecord.encryptionKey,
        recipient: recipientAddress || recipientEmail,
        message: transferMessage,
        transferredAt: new Date().toISOString()
      };

      await onTransfer(transferData);
      onClose();
    } catch (error) {
      setError(`Transfer failed: ${error.message}`);
    } finally {
      setIsTransferring(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h3>🚀 Transfer File</h3>
          <button onClick={onClose} className="close-button">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="file-preview">
            <div className="file-icon">
              {fileRecord?.type?.startsWith('image/') ? '🖼️' : 
               fileRecord?.type?.startsWith('video/') ? '🎥' : 
               fileRecord?.type?.startsWith('audio/') ? '🎵' : '📁'}
            </div>
            <div>
              <h4>{fileRecord?.name}</h4>
              <p>{fileRecord?.size ? (fileRecord.size / 1024).toFixed(2) + ' KB' : ''}</p>
            </div>
          </div>

          <div className="transfer-form">
            <div className="form-group">
              <label>
                <User size={16} />
                Recipient Wallet Address
              </label>
              <input
                type="text"
                placeholder="0x1234567890abcdef..."
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-divider">OR</div>

            <div className="form-group">
              <label>
                <Key size={16} />
                Recipient Email (for notification)
              </label>
              <input
                type="email"
                placeholder="recipient@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Transfer Message (Optional)</label>
              <textarea
                placeholder="Add a message for the recipient..."
                value={transferMessage}
                onChange={(e) => setTransferMessage(e.target.value)}
                className="form-textarea"
                rows="3"
              />
            </div>

            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button 
            onClick={handleTransfer}
            disabled={isTransferring}
            className="transfer-button"
          >
            {isTransferring ? (
              <>
                <div className="button-spinner"></div>
                Transferring...
              </>
            ) : (
              <>
                <Send size={16} />
                Transfer File
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TransferModal;
