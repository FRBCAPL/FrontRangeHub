/**
 * Makes all Bootstrap modals draggable by their header.
 * Drag by the modal header to reposition; position resets when modal closes.
 * Uses left/top (not margin) to avoid conflict with styles.css "margin: 0 !important".
 */
(function () {
    'use strict';

    function makeModalDraggable(modalEl) {
        const dialog = modalEl.querySelector('.modal-dialog');
        const header = modalEl.querySelector('.modal-header');
        if (!dialog || !header) return;

        // Only initialize once per modal
        if (header.dataset.draggableInit === '1') return;
        header.dataset.draggableInit = '1';

        // Use left/top because styles.css has margin: 0 !important on .modal.show .modal-dialog
        var dragState = { offsetX: 0, offsetY: 0, isDragging: false };

        function onMouseDown(e) {
            // Don't drag if clicking close button or any button
            if (e.target.closest('.btn-close') || e.target.closest('button') || e.target.tagName === 'BUTTON') return;
            // Only drag from header itself, not inputs/buttons inside it
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            e.preventDefault();
            dragState.isDragging = true;

            var startX = e.clientX;
            var startY = e.clientY;
            var startOffsetX = dragState.offsetX;
            var startOffsetY = dragState.offsetY;

            header.style.cursor = 'grabbing';
            header.style.userSelect = 'none';

            function onMouseMove(ev) {
                if (!dragState.isDragging) return;
                dragState.offsetX = startOffsetX + (ev.clientX - startX);
                dragState.offsetY = startOffsetY + (ev.clientY - startY);
                dialog.style.left = dragState.offsetX + 'px';
                dialog.style.top = dragState.offsetY + 'px';
            }

            function onMouseUp() {
                dragState.isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                header.style.cursor = 'grab';
                header.style.userSelect = '';
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        header.style.cursor = 'grab';
        header.addEventListener('mousedown', onMouseDown);

        // Store state for reset
        dialog._dragState = dragState;
    }

    function resetModalPosition(modalEl) {
        const dialog = modalEl.querySelector('.modal-dialog');
        if (dialog) {
            dialog.style.left = '';
            dialog.style.top = '';
            if (dialog._dragState) {
                dialog._dragState.offsetX = 0;
                dialog._dragState.offsetY = 0;
            }
        }
    }

    function init() {
        // Use event delegation for dynamically created modals too
        document.addEventListener('shown.bs.modal', function (e) {
            var modalEl = e.target;
            if (modalEl.classList.contains('modal')) {
                makeModalDraggable(modalEl);
            }
        });

        document.addEventListener('hidden.bs.modal', function (e) {
            var modalEl = e.target;
            if (modalEl.classList.contains('modal')) {
                resetModalPosition(modalEl);
            }
        });

        // Also initialize any existing modals
        document.querySelectorAll('.modal').forEach(function (modalEl) {
            if (modalEl.querySelector('.modal-dialog') && modalEl.querySelector('.modal-header')) {
                // Will be initialized on first show
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
