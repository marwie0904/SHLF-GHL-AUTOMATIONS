const axios = require('axios');
const FormData = require('form-data');
const { v4: uuidv4 } = require('uuid');

/**
 * Parses raw Jotform webhook data for workshop event
 * @param {string} rawData - Raw webhook data from Jotform
 * @returns {Object} Parsed workshop data
 */
async function parseRawData(rawData) {
    /*
    example raw data:
      "rawRequest": "{\"slug\":\"submit\\/253117572694059\",\"jsExecutionTracker\":\"build-date-1762649478292=>init-started:1762649478626=>validator-called:1762649478654=>validator-mounted-false:1762649478654=>init-complete:1762649478656=>interval-complete:1762649499656=>onsubmit-fired:1762649526941=>observerSubmitHandler_received-submit-event:1762649526941=>submit-validation-passed:1762649526945=>observerSubmitHandler_validation-passed-submitting-form:1762649526948\",\"submitSource\":\"form\",\"submitDate\":\"1762649526949\",\"buildDate\":\"1762649478292\",\"uploadServerUrl\":\"https:\\/\\/upload.jotform.com\\/upload\",\"eventObserver\":\"1\",\"q3_workshopName\":\"test\",\"q5_workshopDate\":{\"month\":\"11\",\"day\":\"18\",\"year\":\"2025\"},\"q4_workshopTime\":{\"timeInput\":\"12:42\",\"hourSelect\":\"12\",\"minuteSelect\":\"42\",\"ampm\":\"AM\"},\"q7_workshopAddress\":{\"addr_line1\":\" test test test test test\",\"addr_line2\":\" test test test test test\",\"city\":\" test test test test test\",\"state\":\" test test test test test\",\"postal\":\" test test test test\"},\"q8_workshopDescription\":\"test descriptoopm\",\"q9_workshopNotes\":\"test notes\",\"event_id\":\"1762649478626_253117572694059_PMS9aTq\",\"timeToSubmit\":\"20\",\"temp_upload\":{\"q10_relevantFiles\":[\"01-NSTP001-StEF-Mapua-NSTP.doc#jotformfs-e4f4ece4d0a90#019a6619-5179-7073-83dd-6607099348bf\"]},\"file_server\":\"jotformfs-e4f4ece4d0a90#019a6619-5179-7073-83dd-6607099348bf\",\"validatedNewRequiredFieldIDs\":\"{\\\"new\\\":1}\",\"path\":\"\\/submit\\/253117572694059\",\"relevantFiles\":[\"https:\\/\\/www.jotform.com\\/uploads\\/Andy_Baker_info\\/253117572694059\\/6384587270219720384\\/01-NSTP001-StEF-Mapua-NSTP.doc\"]}",
    */

    let parsedData;

    // Parse raw data if it's a string
    if (typeof rawData === 'string') {
        try {
            parsedData = JSON.parse(rawData);
        } catch (e) {
            throw new Error('Failed to parse rawData JSON: ' + e.toString());
        }
    } else {
        parsedData = rawData;
    }

    // Extract workshop fields
    const workshopName = parsedData.q3_workshopName || '';
    const workshopDate = parsedData.q5_workshopDate || {};
    const workshopTime = parsedData.q4_workshopTime || {};
    const workshopAddress = parsedData.q7_workshopAddress || {};
    const workshopDescription = parsedData.q8_workshopDescription || '';
    const workshopNotes = parsedData.q9_workshopNotes || '';
    const relevantFiles = parsedData.relevantFiles || [];

    // Format date
    const formattedDate = workshopDate.month && workshopDate.day && workshopDate.year
        ? `${workshopDate.month}/${workshopDate.day}/${workshopDate.year}`
        : '';

    // Format time
    const formattedTime = workshopTime.timeInput || '';

    // Format address
    const fullAddress = [
        workshopAddress.addr_line1,
        workshopAddress.addr_line2,
        workshopAddress.city,
        workshopAddress.state,
        workshopAddress.postal
    ].filter(Boolean).join(', ').trim();

    return {
        workshopName,
        workshopDate: formattedDate,
        workshopTime: formattedTime,
        workshopAddress: fullAddress,
        workshopDescription,
        workshopNotes,
        relevantFiles,
        rawData: parsedData
    };
}

/**
 * Downloads files from Jotform
 * @param {Array<string>} fileUrls - Array of file URLs from Jotform
 * @returns {Promise<Array<Object>>} Array of downloaded file buffers with metadata
 */
async function downloadFiles(fileUrls) {
    if (!fileUrls || fileUrls.length === 0) {
        console.log('No files to download');
        return [];
    }

    const downloadedFiles = [];

    for (const fileUrl of fileUrls) {
        try {
            console.log('Downloading file from:', fileUrl);

            const response = await axios.get(fileUrl, {
                responseType: 'arraybuffer'
            });

            // Extract filename from URL
            const urlParts = fileUrl.split('/');
            const filename = urlParts[urlParts.length - 1] || 'file';

            downloadedFiles.push({
                buffer: Buffer.from(response.data),
                filename: filename,
                url: fileUrl
            });

            console.log('File downloaded successfully:', filename);
        } catch (error) {
            console.error('Error downloading file from', fileUrl, ':', error.message);
            // Continue with other files even if one fails
        }
    }

    return downloadedFiles;
}

/**
 * Uploads files to GHL custom fields
 * @param {Array<Object>} files - Array of downloaded files with buffer and filename
 * @param {string} customFieldId - The custom field ID for files in GHL
 * @param {string} locationId - GHL location ID
 * @param {string} recordId - The ID of the created record (optional, for custom objects)
 * @returns {Promise<Array<string>>} Array of uploaded file URLs/IDs
 */
async function uploadFilesToGHL(files, customFieldId, locationId, recordId = null) {
    const apiKey = process.env.GHL_API_KEY;

    if (!files || files.length === 0) {
        console.log('No files to upload to GHL');
        return [];
    }

    if (!customFieldId) {
        console.warn('Custom field ID not provided, skipping file upload');
        return [];
    }

    try {
        console.log(`Uploading ${files.length} file(s) to GHL...`);

        const formData = new FormData();

        // Add each file to form data with the required naming convention
        // Format: <custom_field_id>_<file_id>
        files.forEach((file) => {
            const fileId = uuidv4(); // Generate unique ID for each file
            const fieldName = `${customFieldId}_${fileId}`;

            formData.append(fieldName, file.buffer, {
                filename: file.filename,
                contentType: 'application/octet-stream'
            });

            console.log(`Added file to form data: ${file.filename} with field name: ${fieldName}`);
        });

        // Build the URL with query parameters
        const uploadUrl = `https://services.leadconnectorhq.com/forms/upload-custom-files?locationId=${locationId}${recordId ? `&recordId=${recordId}` : ''}`;

        console.log('Uploading to URL:', uploadUrl);

        const response = await axios.post(
            uploadUrl,
            formData,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Version': '2021-07-28',
                    ...formData.getHeaders()
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );

        console.log('Files uploaded successfully to GHL:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error uploading files to GHL:', error.response?.data || error.message);
        // Don't throw - we want the workshop to be created even if file upload fails
        return [];
    }
}

/**
 * Creates a workshop record in GHL custom object
 * @param {Object} workshopData - Parsed workshop data
 * @param {Array<Object>} files - Downloaded files (optional)
 * @returns {Promise<Object>} GHL API response
 */
async function createWorkshopGHL(workshopData, files = []) {
    const apiKey = process.env.GHL_API_KEY;
    const locationId = process.env.GHL_LOCATION_ID;
    // The field key for files in the workshops custom object
    const filesFieldKey = 'files';
    // Correct schema key from GHL API: custom_objects.workshops
    const schemaKey = 'custom_objects.workshops';

    if (!apiKey) {
        throw new Error('GHL_API_KEY not configured in environment variables');
    }

    if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured in environment variables');
    }

    try {
        // Build the record data with actual GHL custom object field names
        // Custom fields must be nested inside 'properties' object
        const recordData = {
            locationId: locationId,
            properties: {
                workshops: workshopData.workshopName,
                notes: workshopData.workshopNotes,
                location: workshopData.workshopAddress,
                date: workshopData.workshopDate,
                time: workshopData.workshopTime,
                status: 'scheduled', // Default status
            }
        };

        console.log('Creating workshop record in GHL...');
        console.log('Schema Key:', schemaKey);
        console.log('Record Data:', JSON.stringify(recordData, null, 2));

        const response = await axios.post(
            `https://services.leadconnectorhq.com/objects/${schemaKey}/records`,
            recordData,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('Workshop record created successfully in GHL:', response.data);

        // Upload files if any
        const recordId = response.data.record?.id;
        if (files.length > 0 && recordId) {
            console.log('Uploading files to workshop record...');
            await uploadFilesToGHL(files, filesFieldKey, locationId, recordId);
        }

        return response.data;
    } catch (error) {
        console.error('Error creating workshop record in GHL:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Main function to handle workshop event creation
 * @param {string} rawData - Raw webhook data from Jotform
 * @returns {Promise<Object>} Result object
 */
async function main(rawData) {
    try {
        console.log('Starting workshop event creation process...');

        // Parse the raw data
        const parsedData = await parseRawData(rawData);
        console.log('Workshop data parsed successfully');

        // Download files if any
        const files = await downloadFiles(parsedData.relevantFiles);
        console.log(`Downloaded ${files.length} file(s)`);

        // Create workshop in GHL custom object
        const ghlResponse = await createWorkshopGHL(parsedData, files);

        console.log('Workshop event creation completed successfully');
        return {
            success: true,
            workshopData: parsedData,
            filesDownloaded: files.length,
            ghlResponse: ghlResponse
        };
    } catch (error) {
        console.error('Error in workshop event creation:', error.message);
        throw error;
    }
}

module.exports = {
    main,
    parseRawData,
    downloadFiles,
    uploadFilesToGHL,
    createWorkshopGHL
};
