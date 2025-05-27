const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/test', (req, res) => {
    console.log('TEST ROUTE HIT!');
    res.json({ message: 'Server is working!' });
});

app.post('/generate-hype', async (req, res) => {
    console.log('Hype route hit! Request body:', req.body);
    
    try {
        const { word1, word2, word3 } = req.body;
        
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 150,
            messages: [{
                role: 'user',
                content: `Create an energetic, motivational team message that incorporates these three words: "${word1}", "${word2}", and "${word3}". Make it 2-3 sentences, upbeat, and perfect for a team Slack channel. Include emojis.`
            }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            }
        });

        const hypeMessage = response.data.content[0].text;
        res.json({ message: hypeMessage });
        
    } catch (error) {
        console.log('Error details:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate hype message' });
    }
});

// Add Slack route
app.post('/slack/send', async (req, res) => {
    try {
        const { channel, word1, word2, word3 } = req.body;
        
        // Generate hype message
        const response = await axios.post('https://api.anthropic.com/v1/messages', {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 150,
            messages: [{
                role: 'user',
                content: `Create an energetic, motivational team message that incorporates these three words: "${word1}", "${word2}", and "${word3}". Make it 2-3 sentences, upbeat, and perfect for a team Slack channel. Include emojis.`
            }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01'
            }
        });

        const hypeMessage = response.data.content[0].text;
        
        // Send to Slack
        await axios.post('https://slack.com/api/chat.postMessage', {
            channel: channel,
            text: hypeMessage
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        res.json({ message: 'Hype message sent to Slack!', hype: hypeMessage });
        
    } catch (error) {
        console.log('Slack error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to send to Slack' });
    }
});

app.use(express.static('.'));

app.listen(PORT, () => {
    console.log(`Hype Bot running on port ${PORT}`);
});