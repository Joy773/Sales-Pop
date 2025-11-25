import { useEffect, useRef, useState } from 'react';

const Savebar = ({ onSave, onDiscard, isDirty, isLoading = false }) => {
  const handlersRef = useRef({ save: null, discard: null });
  const onSaveRef = useRef(onSave);
  const onDiscardRef = useRef(onDiscard);
  const [fallbackVisible, setFallbackVisible] = useState(false);

  // Keep refs up to date
  useEffect(() => {
    onSaveRef.current = onSave;
    onDiscardRef.current = onDiscard;
  }, [onSave, onDiscard]);

  // Show/hide savebar based on isDirty
  useEffect(() => {
    const saveBar = document.getElementById('my-save-bar');
    if (!saveBar) {
      setFallbackVisible(isDirty);
      // Retry after a short delay
      const timeoutId = setTimeout(() => {
        const bar = document.getElementById('my-save-bar');
        if (bar) {
          if (isDirty) {
            try {
              bar.show();
              setFallbackVisible(false);
            } catch (e) {
              console.error('Savebar show error (retry):', e);
            }
          } else {
            try {
              bar.hide();
              setFallbackVisible(false);
            } catch (e) {
              console.error('Savebar hide error (retry):', e);
            }
          }
        } else {
          setFallbackVisible(isDirty);
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    // Show or hide based on isDirty
    try {
      if (isDirty) {
        saveBar.show();
        setFallbackVisible(false);
      } else {
        saveBar.hide();
        setFallbackVisible(false);
      }
    } catch (e) {
      console.error('Savebar show/hide error:', e);
      setFallbackVisible(isDirty);
    }
  }, [isDirty]);

  // Setup event listeners
  useEffect(() => {
    // Create handler functions - DON'T use preventDefault so App Bridge can handle hide
    const handleSave = async (e) => {
      if (onSaveRef.current) {
        try {
          await onSaveRef.current();
          // isDirty will become false after save, which will hide the savebar
        } catch (error) {
          console.error('Save error:', error);
        }
      } else {
        console.error('onSave is not defined!');
      }
    };

    const handleDiscard = (e) => {
      if (onDiscardRef.current) {
        onDiscardRef.current();
        // isDirty will become false after discard, which will hide the savebar
      }
    };

    // Store handlers in ref
    handlersRef.current.save = handleSave;
    handlersRef.current.discard = handleDiscard;

    // Function to attach event listeners
    const attachListeners = () => {
      const saveButton = document.getElementById('save-button');
      const discardButton = document.getElementById('discard-button');

      if (!saveButton || !discardButton) {
        return false;
      }

      // Remove old listeners if they exist
      if (handlersRef.current.save && saveButton) {
        saveButton.removeEventListener('click', handlersRef.current.save);
      }
      if (handlersRef.current.discard && discardButton) {
        discardButton.removeEventListener('click', handlersRef.current.discard);
      }

      // Attach listeners
      saveButton.addEventListener('click', handleSave);
      discardButton.addEventListener('click', handleDiscard);
      
      return true;
    };

    // Try to attach immediately
    let attached = attachListeners();
    
    // If buttons don't exist, wait a bit and retry
    if (!attached) {
      const timeoutId = setTimeout(() => {
        attachListeners();
      }, 300);

      return () => {
        clearTimeout(timeoutId);
        // Cleanup listeners using captured handlers
        const saveButton = document.getElementById('save-button');
        const discardButton = document.getElementById('discard-button');
        if (saveButton && handleSave) {
          saveButton.removeEventListener('click', handleSave);
        }
        if (discardButton && handleDiscard) {
          discardButton.removeEventListener('click', handleDiscard);
        }
      };
    }

    // Cleanup function
    return () => {
      const saveButton = document.getElementById('save-button');
      const discardButton = document.getElementById('discard-button');
      // Use captured handlers from effect scope
      if (saveButton && handleSave) {
        saveButton.removeEventListener('click', handleSave);
      }
      if (discardButton && handleDiscard) {
        discardButton.removeEventListener('click', handleDiscard);
      }
    };
  }, []);

  return (
    <>
      <ui-save-bar id="my-save-bar">
        <button variant="primary" id="save-button" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save'}
        </button>
        <button id="discard-button" disabled={isLoading}>Discard</button>
      </ui-save-bar>

      {fallbackVisible && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: '12px',
            padding: '16px',
            backgroundColor: '#1f2933',
            boxShadow: '0 -4px 16px rgba(15, 23, 42, 0.2)',
            zIndex: 9999,
          }}
        >
          <button
            type='button'
            onClick={() => onDiscardRef.current && onDiscardRef.current()}
            disabled={isLoading}
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.18)',
              backgroundColor: 'transparent',
              color: '#ffffff',
              fontWeight: 500,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            Discard
          </button>
          <button
            type='button'
            onClick={() => onSaveRef.current && onSaveRef.current()}
            disabled={isLoading}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background:
                'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(79,70,229,1) 100%)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.6 : 1,
            }}
          >
            {isLoading ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </>
  );
};

export default Savebar;
