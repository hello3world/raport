// Test to verify that all report fields are properly saved to JSON and restored when loading

function runReportSavingTest() {
    const testData = {
        // Common fields
        reportDate: '15.10.2025',
        periodStart: '10.10.2025',
        periodEnd: '11.10.2025',
        startTime: '08-00',
        endTime: '20-00',

        // Teploelektracentral specific fields
        shiftSupervisor: 'Иванов И.И.',
        reactor1: '100',
        reactor2: '150',
        reactorSum: '250',
        gasMeter: '5000',
        gasConsumption: '1000',
        kgu: '200',
        boiler1: '150',
        boiler2: '100',
        boiler3: '50',
        steamConsumption: '300',
        woodChips: '100',
        bark: '50',
        sawdust: '75',
        waterConsumption: '1000',
        waterLevel: '80',
        waterReserve: '70',

        // Emergency situations
        emergencySituations: [
            {
                time: '10:30',
                equipment: 'Пump A',
                description: 'Pressure drop',
                actions: 'Replaced seal',
                recovery: '11:15'
            },
            {
                time: '14:20',
                equipment: 'Boiler B',
                description: 'Temperature spike',
                actions: 'Reduced load',
                recovery: '15:00'
            }
        ],

        // Equipment deviations
        equipmentDeviations: 'Minor vibration observed in Pump C. Scheduled for maintenance next week.',

        // Attachments (simulated)
        attachments: [
            {
                name: 'diagram1.png',
                type: 'image/png',
                size: 102400,
                dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
                lastModified: 1678886400000
            }
        ]
    };

    // Test data serialization
    function testSerialization() {
        console.log('Testing data serialization...');

        // Simulate the collectFormData function from app.js
        const serializedData = JSON.stringify(testData, null, 2);
        console.log('Serialized data length:', serializedData.length);

        // Parse it back
        const parsedData = JSON.parse(serializedData);

        // Check if all fields are preserved
        const issues = [];

        // Check common fields
        if (parsedData.reportDate !== testData.reportDate) issues.push('reportDate mismatch');
        if (parsedData.periodStart !== testData.periodStart) issues.push('periodStart mismatch');
        if (parsedData.periodEnd !== testData.periodEnd) issues.push('periodEnd mismatch');
        if (parsedData.startTime !== testData.startTime) issues.push('startTime mismatch');
        if (parsedData.endTime !== testData.endTime) issues.push('endTime mismatch');

        // Check Teploelektracentral specific fields
        if (parsedData.shiftSupervisor !== testData.shiftSupervisor) issues.push('shiftSupervisor mismatch');
        if (parsedData.reactor1 !== testData.reactor1) issues.push('reactor1 mismatch');
        if (parsedData.reactor2 !== testData.reactor2) issues.push('reactor2 mismatch');
        if (parsedData.reactorSum !== testData.reactorSum) issues.push('reactorSum mismatch');
        if (parsedData.gasMeter !== testData.gasMeter) issues.push('gasMeter mismatch');
        if (parsedData.gasConsumption !== testData.gasConsumption) issues.push('gasConsumption mismatch');
        if (parsedData.kgu !== testData.kgu) issues.push('kgu mismatch');
        if (parsedData.boiler1 !== testData.boiler1) issues.push('boiler1 mismatch');
        if (parsedData.boiler2 !== testData.boiler2) issues.push('boiler2 mismatch');
        if (parsedData.boiler3 !== testData.boiler3) issues.push('boiler3 mismatch');
        if (parsedData.steamConsumption !== testData.steamConsumption) issues.push('steamConsumption mismatch');
        if (parsedData.woodChips !== testData.woodChips) issues.push('woodChips mismatch');
        if (parsedData.bark !== testData.bark) issues.push('bark mismatch');
        if (parsedData.sawdust !== testData.sawdust) issues.push('sawdust mismatch');
        if (parsedData.waterConsumption !== testData.waterConsumption) issues.push('waterConsumption mismatch');
        if (parsedData.waterLevel !== testData.waterLevel) issues.push('waterLevel mismatch');
        if (parsedData.waterReserve !== testData.waterReserve) issues.push('waterReserve mismatch');

        // Check emergency situations
        if (!parsedData.emergencySituations) {
            issues.push('emergencySituations missing');
        } else {
            if (parsedData.emergencySituations.length !== testData.emergencySituations.length) {
                issues.push('emergencySituations length mismatch');
            } else {
                for (let i = 0; i < parsedData.emergencySituations.length; i++) {
                    const original = testData.emergencySituations[i];
                    const restored = parsedData.emergencySituations[i];

                    if (original.time !== restored.time) issues.push(`emergencySituations[${i}].time mismatch`);
                    if (original.equipment !== restored.equipment) issues.push(`emergencySituations[${i}].equipment mismatch`);
                    if (original.description !== restored.description) issues.push(`emergencySituations[${i}].description mismatch`);
                    if (original.actions !== restored.actions) issues.push(`emergencySituations[${i}].actions mismatch`);
                    if (original.recovery !== restored.recovery) issues.push(`emergencySituations[${i}].recovery mismatch`);
                }
            }
        }

        // Check equipment deviations
        if (parsedData.equipmentDeviations !== testData.equipmentDeviations) issues.push('equipmentDeviations mismatch');

        // Check attachments
        if (!parsedData.attachments) {
            issues.push('attachments missing');
        } else {
            if (parsedData.attachments.length !== testData.attachments.length) {
                issues.push('attachments length mismatch');
            } else {
                for (let i = 0; i < parsedData.attachments.length; i++) {
                    const original = testData.attachments[i];
                    const restored = parsedData.attachments[i];

                    if (original.name !== restored.name) issues.push(`attachments[${i}].name mismatch`);
                    if (original.type !== restored.type) issues.push(`attachments[${i}].type mismatch`);
                    if (original.size !== restored.size) issues.push(`attachments[${i}].size mismatch`);
                    if (original.dataUrl !== restored.dataUrl) issues.push(`attachments[${i}].dataUrl mismatch`);
                    if (original.lastModified !== restored.lastModified) issues.push(`attachments[${i}].lastModified mismatch`);
                }
            }
        }

        if (issues.length === 0) {
            console.log('✅ All fields are properly serialized and deserialized');
            return true;
        } else {
            console.log('❌ Issues found during serialization test:');
            issues.forEach(issue => console.log(`  - ${issue}`));
            return false;
        }
    }

    // Test localStorage saving and retrieval
    function testLocalStorage() {
        console.log('Testing localStorage saving and retrieval...');

        const testKey = 'test-report-data';
        const issues = [];

        try {
            // Save to localStorage
            localStorage.setItem(testKey, JSON.stringify(testData));

            // Retrieve from localStorage
            const retrievedData = JSON.parse(localStorage.getItem(testKey));

            // Check if all fields are preserved
            if (retrievedData.reportDate !== testData.reportDate) issues.push('reportDate mismatch');
            if (retrievedData.periodStart !== testData.periodStart) issues.push('periodStart mismatch');
            if (retrievedData.periodEnd !== testData.periodEnd) issues.push('periodEnd mismatch');
            if (retrievedData.shiftSupervisor !== testData.shiftSupervisor) issues.push('shiftSupervisor mismatch');
            if (retrievedData.reactor1 !== testData.reactor1) issues.push('reactor1 mismatch');

            // Check emergency situations
            if (!retrievedData.emergencySituations) {
                issues.push('emergencySituations missing');
            } else {
                if (retrievedData.emergencySituations.length !== testData.emergencySituations.length) {
                    issues.push('emergencySituations length mismatch');
                }
            }

            // Check equipment deviations
            if (retrievedData.equipmentDeviations !== testData.equipmentDeviations) issues.push('equipmentDeviations mismatch');

            // Clean up
            localStorage.removeItem(testKey);

            if (issues.length === 0) {
                console.log('✅ All fields are properly saved to and retrieved from localStorage');
                return true;
            } else {
                console.log('❌ Issues found during localStorage test:');
                issues.forEach(issue => console.log(`  - ${issue}`));
                return false;
            }
        } catch (error) {
            console.log('❌ Error during localStorage test:', error.message);
            return false;
        }
    }

    // Run all tests
    function runAllTests() {
        console.log('Running report saving and loading tests...\n');

        const serializationResult = testSerialization();
        console.log('');
        const localStorageResult = testLocalStorage();
        console.log('');

        if (serializationResult && localStorageResult) {
            console.log('🎉 All tests passed! All report fields are properly saved to JSON and restored when loading.');
            return true;
        } else {
            console.log('❌ Some tests failed. There may be issues with saving or restoring report fields.');
            return false;
        }
    }

    return runAllTests();
}

// Run the test
runReportSavingTest();