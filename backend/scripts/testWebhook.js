const axios = require('axios');

const testWebhook = async () => {
    try {
        const payload = {
            From: 'whatsapp:+1234567890', // Replace with a test number
            Body: 'I am interested in saving for my child\'s education and maybe some gold investments.',
            MediaUrl0: '', // Leave empty for text, or add a URL for audio
            MediaContentType0: ''
        };

        console.log('Sending payload:', payload);

        const response = await axios.post('http://localhost:3000/api/whatsapp/webhook', payload);

        console.log('Response status:', response.status);
        console.log('Response data:', response.data);
    } catch (error) {
        if (error.response) {
            console.error('Error response:', error.response.status, error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testWebhook();
