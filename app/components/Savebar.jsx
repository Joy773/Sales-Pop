import { useEffect, useRef } from 'react';

const Savebar = ({ onSave, onDiscard, isDirty }) => {
  const handlersRef = useRef({ save: null, discard: null });
  const onSaveRef = useRef(onSave);
  const onDiscardRef = useRef(onDiscard);

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
      // Retry after a short delay
      const timeoutId = setTimeout(() => {
        const bar = document.getElementById('my-save-bar');
        if (bar) {
          if (isDirty) {
            try {
              bar.show();
              console.log('✅ Savebar shown (retry)');
            } catch (e) {
              console.log('Savebar show error (retry):', e);
            }
          } else {
            try {
              bar.hide();
              console.log('✅ Savebar hidden (retry)');
            } catch (e) {
              console.log('Savebar hide error (retry):', e);
            }
          }
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    // Show or hide based on isDirty
    try {
      if (isDirty) {
        saveBar.show();
        console.log('✅ Savebar shown');
      } else {
        saveBar.hide();
        console.log('✅ Savebar hidden');
      }
    } catch (e) {
      console.log('Savebar show/hide error:', e);
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
    <ui-save-bar id="my-save-bar">
      <button variant="primary" id="save-button">Save</button>
      <button id="discard-button">Discard</button>
    </ui-save-bar>
  );
};

export default Savebar;
