// Test script for Flatpickr functionality
console.log("Testing Flatpickr integration...");

// Check if flatpickr is available
if (typeof flatpickr !== 'undefined') {
    console.log("✓ Flatpickr library loaded successfully");

    // Test initialization on a sample input
    const testInput = document.createElement('input');
    testInput.type = 'text';
    testInput.className = 'emergency-datetime';
    document.body.appendChild(testInput);

    try {
        flatpickr(testInput, {
            locale: 'ru',
            dateFormat: 'd.m.Y H:i',
            enableTime: true,
            time_24hr: true,
            allowInput: true,
            minuteIncrement: 1
        });
        console.log("✓ Flatpickr initialized successfully on test input");

        // Clean up
        document.body.removeChild(testInput);
    } catch (error) {
        console.error("✗ Error initializing Flatpickr:", error);
    }
} else {
    console.error("✗ Flatpickr library not found");
}

console.log("Flatpickr test completed.");