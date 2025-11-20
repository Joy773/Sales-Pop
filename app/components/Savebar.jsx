import { useEffect, useRef, useState } from 'react';

const Savebar = ({ onSave, onDiscard, isDirty }) => {
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
    console.log('🔧 Savebar useEffect running - isDirty:', isDirty);
    
    const saveBar = document.getElementById('my-save-bar');
    if (!saveBar) {
      console.warn('⚠️ my-save-bar element not found');
      setFallbackVisible(isDirty);
      // Retry after a short delay
      const timeoutId = setTimeout(() => {
        const bar = document.getElementById('my-save-bar');
        if (bar) {
          if (isDirty) {
            try {
              bar.show();
              setFallbackVisible(false);
              console.log('✅ Savebar shown (retry)');
            } catch (e) {
              console.log('Savebar show error (retry):', e);
            }
          } else {
            try {
              bar.hide();
              setFallbackVisible(false);
              console.log('✅ Savebar hidden (retry)');
            } catch (e) {
              console.log('Savebar hide error (retry):', e);
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
        console.log('✅ Savebar shown');
      } else {
        saveBar.hide();
        setFallbackVisible(false);
        console.log('✅ Savebar hidden');
      }
    } catch (e) {
      console.log('Savebar show/hide error:', e);
      setFallbackVisible(isDirty);
    }
  }, [isDirty]);

  // Setup event listeners
  useEffect(() => {
    // Create handler functions - DON'T use preventDefault so App Bridge can handle hide
    const handleSave = async (e) => {
      console.log('🟢 Save button clicked!');
      if (onSaveRef.current) {
        console.log('🟢 Calling onSave...');
        try {
          await onSaveRef.current();
          // isDirty will become false after save, which will hide the savebar
        } catch (error) {
          console.error('Save error:', error);
        }
      } else {
        console.error('❌ onSave is not defined!');
      }
    };

    const handleDiscard = (e) => {
      console.log('🟡 Discard button clicked!');
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

      if (!saveButton) {
        console.warn('⚠️ save-button not found');
        return false;
      }
      if (!discardButton) {
        console.warn('⚠️ discard-button not found');
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
      
      console.log('✅ Event listeners attached to buttons');
      return true;
    };

    // Try to attach immediately
    let attached = attachListeners();
    
    // If buttons don't exist, wait a bit and retry
    if (!attached) {
      console.log('⏳ Buttons not ready, waiting...');
      const timeoutId = setTimeout(() => {
        console.log('⏳ Retrying to attach listeners...');
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
      console.log('🧹 Cleaning up event listeners');
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
        <button variant="primary" id="save-button">Save</button>
        <button id="discard-button">Discard</button>
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
            style={{
              padding: '10px 18px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.18)',
              backgroundColor: 'transparent',
              color: '#ffffff',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Discard
          </button>
          <button
            type='button'
            onClick={() => onSaveRef.current && onSaveRef.current()}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background:
                'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(79,70,229,1) 100%)',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      )}
    </>
  );
};

export default Savebar;
