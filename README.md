# JotForm to GoHighLevel Contact Automation

This service receives JotForm webhook submissions and automatically creates contacts in GoHighLevel (GHL) with all form data mapped to custom fields.

## Features

- ✅ Receives JotForm webhook data
- ✅ Parses and validates form submissions
- ✅ Maps beneficiaries (up to 5) to GHL custom fields
- ✅ Maps bank/finance accounts (up to 5) to GHL custom fields
- ✅ Maps current spouse, financial advisor, and accountant information
- ✅ Creates contact in GHL via API
- ✅ Conditionally triggers PDF webhook if requested

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
PORT=3000
PDF_WEBHOOK_URL=https://hook.us2.make.com/jj0powamiwz5hrry7ixpejtnin43qye9
\`\`\`

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
4. **Create Contact** → Send API request to create contact in GHL
5. **PDF Trigger** → If `savePdf` is true, trigger Make.com webhook

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
