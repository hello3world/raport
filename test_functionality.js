// Test script to verify the functionality
console.log("Testing draft restoration functionality...");

// Wait for the app to be initialized
document.addEventListener('DOMContentLoaded', function () {
    // Test 1: Check if ReportFormApp class exists
    if (typeof ReportFormApp !== 'undefined') {
        console.log("✓ ReportFormApp class exists");
    } else {
        console.log("✗ ReportFormApp class missing");
    }

    // Test 2: Check if app instance exists
    if (typeof window.reportApp !== 'undefined') {
        console.log("✓ reportApp instance exists");
    } else {
        console.log("✗ reportApp instance missing");
    }

    // Test 3: Check if restoreDraft method exists
    if (typeof window.reportApp !== 'undefined' && typeof window.reportApp.restoreDraft === 'function') {
        console.log("✓ restoreDraft method exists");
    } else {
        console.log("✗ restoreDraft method missing");
    }

    // Test 4: Check if populateForm method exists
    if (typeof window.reportApp !== 'undefined' && typeof window.reportApp.populateForm === 'function') {
        console.log("✓ populateForm method exists");
    } else {
        console.log("✗ populateForm method missing");
    }

    // Test 5: Check if clearDepartmentDraftsFromLocalStorage method exists
    if (typeof window.reportApp !== 'undefined' && typeof window.reportApp.clearDepartmentDraftsFromLocalStorage === 'function') {
        console.log("✓ clearDepartmentDraftsFromLocalStorage method exists");
    } else {
        console.log("✗ clearDepartmentDraftsFromLocalStorage method missing");
    }

    // Test 6: Check if startNewForm method exists
    if (typeof window.reportApp !== 'undefined' && typeof window.reportApp.startNewForm === 'function') {
        console.log("✓ startNewForm method exists");
    } else {
        console.log("✗ startNewForm method missing");
    }

    console.log("Testing complete.");
});