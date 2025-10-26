# JotForm to GoHighLevel Contact Automation

This service receives JotForm webhook submissions and automatically creates contacts in GoHighLevel (GHL) with all form data mapped to custom fields.

## Features

- ✅ Receives JotForm webhook data
- ✅ Parses and validates form submissions
- ✅ Maps beneficiaries (up to 5) to GHL custom fields
- ✅ Maps bank/finance accounts (up to 5) to GHL custom fields
- ✅ Maps current spouse, financial advisor, and accountant information
- ✅ Creates or updates contact in GHL via API (handles duplicates)
- ✅ Downloads PDF from JotForm and uploads to GHL custom field
- ✅ Checks for existing PDFs and replaces them automatically

## Setup

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment Variables

Create a \`.env\` file in the root directory:

\`\`\`env
GHL_API_KEY=your_ghl_api_key_here
GHL_LOCATION_ID=your_ghl_location_id_here
GHL_PDF_FIELD_ID=UvlnLTzwo1TQe2KXDfzW
JOTFORM_API_KEY=your_jotform_api_key_here
PORT=3000
\`\`\`

**Required Variables:**
- \`GHL_API_KEY\` - GoHighLevel API key (Bearer token)
- \`GHL_LOCATION_ID\` - Your GHL location ID
- \`GHL_PDF_FIELD_ID\` - Custom field ID for PDF uploads (default: UvlnLTzwo1TQe2KXDfzW)
- \`JOTFORM_API_KEY\` - JotForm API key for PDF downloads

**Optional:**
- \`PORT\` - Server port (defaults to 3000)

### 3. Start the Server

**Development mode:**
\`\`\`bash
npm run dev
\`\`\`

**Production mode:**
\`\`\`bash
npm start
\`\`\`

## API Endpoints

### Health Check
\`\`\`
GET /health
\`\`\`

### JotForm Webhook
\`\`\`
POST /webhook/jotform
\`\`\`

Configure this URL in your JotForm webhook settings.

## Project Structure

\`\`\`
.
├── server.js                    # Express server and webhook endpoint
├── utils/
│   ├── jotformParser.js        # Parses JotForm webhook data
│   └── dataMapper.js           # Maps JotForm data to GHL format
├── services/
│   ├── ghlService.js           # GHL API integration
│   └── webhookService.js       # PDF webhook trigger
├── jotform-to-ghl-mapping.json # Field mapping configuration
├── package.json
└── .env.example
\`\`\`

## Data Flow

1. **Receive Webhook** → JotForm sends webhook to `/webhook/jotform`
2. **Parse Data** → Extract and decode form fields
3. **Map to GHL** → Convert JotForm fields to GHL custom field format
4. **Create/Update Contact** → Send API request to create or update contact in GHL
   - If duplicate detected, searches for existing contact and updates it
5. **PDF Processing** → If `savePdf` is "Yes":
   - Download PDF from JotForm API
   - Check if contact has existing PDF in custom field
   - Upload new PDF to GHL (replaces existing if present)

## Field Mappings

- **Basic Contact**: firstName, lastName
- **Current Spouse**: Name, Veteran status
- **Financial Advisor**: Name, Firm, Phone
- **Accountant**: Name, Firm, Phone
- **Beneficiaries 1-5**: Name, DOB, Occupation, Phone, Sex, Relationship, Address, etc.
- **Banks 1-5**: Bank Name, Representative, Account Type, Owner(s), Approx Value

See `jotform-to-ghl-mapping.json` for complete field mappings.

## Deployment (Digital Ocean)

1. Push code to repository
2. Create a new Digital Ocean App
3. Configure environment variables in App settings
4. Deploy from repository
5. Update JotForm webhook URL to your app URL + `/webhook/jotform`

## Error Handling

The service includes error handling for:
- Invalid JSON parsing
- Missing environment variables
- GHL API failures
- PDF webhook failures

All errors are logged to console and returned in API responses.
