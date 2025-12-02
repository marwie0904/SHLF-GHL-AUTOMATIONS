const axios = require('axios');
const FormData = require('form-data');
const { createClient } = require('@supabase/supabase-js');

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
    const workshopType = parsedData.q11_typeOfWorkshop || '';
    const maxCapacity = parsedData.q12_capacity || '';
    const relevantFiles = parsedData.relevantFiles || [];

    // Format date
    const formattedDate = workshopDate.month && workshopDate.day && workshopDate.year
        ? `${workshopDate.month}/${workshopDate.day}/${workshopDate.year}`
        : '';

    // Format time with AM/PM - normalize to uppercase for consistency
    let formattedTime = '';
    if (workshopTime.hourSelect && workshopTime.minuteSelect && workshopTime.ampm) {
        formattedTime = `${workshopTime.hourSelect}:${workshopTime.minuteSelect} ${workshopTime.ampm.toUpperCase()}`;
    } else if (workshopTime.timeInput) {
        // Fallback to timeInput if structured time not available
        formattedTime = workshopTime.timeInput;
    }

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
        workshopType,
        maxCapacity,
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
 * Gets the MIME type for a file based on extension
 * @param {string} filename - The filename
 * @returns {string} MIME type
 */
function getMimeType(filename) {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes = {
        // Documents
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'rtf': 'application/rtf',
        'csv': 'text/csv',
        'zip': 'application/zip',
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        // Video
        'mp4': 'video/mp4',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        // Audio
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * Uploads files to GHL Media Storage
 * @param {Array<Object>} files - Array of downloaded files with buffer and filename
 * @param {string} locationId - GHL location ID
 * @returns {Promise<Array<string>>} Array of uploaded file URLs
 */
async function uploadFilesToMediaStorage(files, locationId) {
    const apiKey = process.env.GHL_API_KEY;

    if (!files || files.length === 0) {
        console.log('No files to upload to GHL');
        return [];
    }

    try {
        console.log(`Uploading ${files.length} file(s) to GHL Media Storage...`);
        const uploadedUrls = [];

        for (const file of files) {
            const mimeType = getMimeType(file.filename);
            console.log(`Uploading file to Media Storage: ${file.filename} (type: ${mimeType})`);

            const formData = new FormData();
            formData.append('file', file.buffer, {
                filename: file.filename,
                contentType: mimeType
            });

            const response = await axios.post(
                `https://services.leadconnectorhq.com/medias/upload-file?locationId=${locationId}`,
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

            console.log('File uploaded to Media Storage:', response.data);

            // Extract file information from response
            // Media Storage returns: { fileId, url, traceId }
            // Store as object with both fileId and url for GHL custom objects
            if (response.data.url) {
                uploadedUrls.push({
                    fileId: response.data.fileId,
                    url: response.data.url
                });
                console.log(`File uploaded - ID: ${response.data.fileId}, URL: ${response.data.url}`);
            }
        }

        console.log(`Successfully uploaded ${uploadedUrls.length} file(s) to Media Storage`);
        return uploadedUrls;
    } catch (error) {
        console.error('Error uploading files to Media Storage:', error.response?.data || error.message);
        // Don't throw - we want the workshop to be created even if file upload fails
        return [];
    }
}

/**
 * Updates workshop record with file URLs
 * @param {string} recordId - The workshop record ID
 * @param {Array<string>} fileUrls - Array of file URLs from Media Storage
 * @returns {Promise<Object>} GHL API response
 */
async function updateWorkshopFiles(recordId, fileUrls) {
    const apiKey = process.env.GHL_API_KEY;

    if (!fileUrls || fileUrls.length === 0) {
        console.log('No file URLs to update');
        return null;
    }

    try {
        console.log(`Updating workshop record ${recordId} with ${fileUrls.length} file URL(s)...`);

        // Try the simpler endpoint pattern: /objects/records/{recordId}
        const response = await axios.patch(
            `https://services.leadconnectorhq.com/objects/records/${recordId}`,
            {
                properties: {
                    files: fileUrls
                }
            },
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Version': '2021-07-28'
                }
            }
        );

        console.log('Workshop files updated successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating workshop files:', error.response?.data || error.message);
        // Don't throw - workshop was already created
        return null;
    }
}

/**
 * Saves workshop record to Supabase
 * @param {string} ghlWorkshopId - GHL workshop record ID
 * @param {Object} workshopData - Parsed workshop data
 * @returns {Promise<Object>} Supabase response
 */
async function saveWorkshopToSupabase(ghlWorkshopId, workshopData) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('SUPABASE_URL or SUPABASE_KEY not configured in environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Saving workshop to Supabase...');

        const { data, error } = await supabase
            .from('workshops')
            .insert({
                ghl_workshop_id: ghlWorkshopId,
                title: workshopData.workshopName,
                event_date: workshopData.workshopDate,
                event_time: workshopData.workshopTime,
                workshop_type: workshopData.workshopType,
                location: workshopData.workshopAddress,
                description: workshopData.workshopDescription,
                notes: workshopData.workshopNotes,
                max_capacity: workshopData.maxCapacity
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        console.log('Workshop saved to Supabase successfully:', data);
        return data;
    } catch (error) {
        console.error('Error saving workshop to Supabase:', error.message);
        throw error;
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
    // Correct schema key from GHL API: custom_objects.workshops
    const schemaKey = 'custom_objects.workshops';

    if (!apiKey) {
        throw new Error('GHL_API_KEY not configured in environment variables');
    }

    if (!locationId) {
        throw new Error('GHL_LOCATION_ID not configured in environment variables');
    }

    try {
        // Note: Files are downloaded but not uploaded to GHL
        // File upload will be handled by a separate automation
        if (files.length > 0) {
            console.log(`Downloaded ${files.length} file(s) - file upload will be handled separately`);
        }

        // Build the record data with actual GHL custom object field names
        // Custom fields must be nested inside 'properties' object
        // Field keys from GHL schema: custom_objects.workshops.*
        const recordData = {
            locationId: locationId,
            properties: {
                title: workshopData.workshopName,
                date: workshopData.workshopDate,
                time: workshopData.workshopTime,
                location: workshopData.workshopAddress,
                type: workshopData.workshopType?.toLowerCase() || '', // Options: seminar, webinar
                max_capacity: workshopData.maxCapacity ? parseInt(workshopData.maxCapacity, 10) : null,
                joined_attendees: 0, // Initialize with 0 attendees
                notes: [workshopData.workshopDescription, workshopData.workshopNotes].filter(Boolean).join('\n\n'),
                status: 'scheduled', // Options: scheduled, cancelled, finished
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

        // Extract the record ID - GHL custom objects API returns it nested in record.id
        const recordId = response.data.record?.id || response.data.id || response.data.recordId || response.data._id;
        if (!recordId) {
            console.error('No record ID found in GHL response:', response.data);
            throw new Error('GHL API did not return a record ID');
        }

        console.log('Extracted workshop record ID:', recordId);
        return { ...response.data.record, id: recordId };
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

        // Save workshop to Supabase
        const supabaseResponse = await saveWorkshopToSupabase(ghlResponse.id, parsedData);

        console.log('Workshop event creation completed successfully');
        return {
            success: true,
            workshopData: parsedData,
            filesDownloaded: files.length,
            ghlResponse: ghlResponse,
            supabaseResponse: supabaseResponse
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
    uploadFilesToMediaStorage,
    updateWorkshopFiles,
    createWorkshopGHL,
    saveWorkshopToSupabase
};
