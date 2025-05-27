const express = require('express');
const axios = require('axios');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// Motivational word pools for random selection
const wordPools = {
    action: ['crushing', 'smashing', 'conquering', 'dominating', 'achieving', 'executing', 'delivering', 'building'],
    challenge: ['deadline', 'goal', 'target', 'milestone', 'challenge', 'project', 'sprint', 'mission'],
    outcome: ['victory', 'success', 'excellence', 'triumph', 'breakthrough', 'achievement', 'win', 'results']
};

// Function to get random words
function getRandomWords() {
    const word1 = wordPools.action[Math.floor(Math.random() * wordPools.action.length)];
    const word2 = wordPools.challenge[Math.floor(Math.random() * wordPools.challenge.length)];
    const word3 = wordPools.outcome[Math.floor(Math.random() * wordPools.outcome.length)];
    return { word1, word2, word3 };
}

// Function to generate hype message
async function generateHypeMessage(word1, word2, word3) {
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

    return response.data.content[0].text;
}

// Function to send message to Slack
async function sendToSlackChannel(channel, message) {
    await axios.post('https://slack.com/api/chat.postMessage', {
        channel: channel,
        text: message
    }, {
        headers: {
            'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`,
            'Content-Type': 'application/json'
        }
    });
}

// Schedule daily hype message - runs Monday-Friday at 9:00 AM
cron.schedule('0 9 * * 1-5', async () => {
    console.log('Running scheduled daily hype message...');
    
    try {
        const { word1, word2, word3 } = getRandomWords();
        console.log(`Daily hype words: ${word1}, ${word2}, ${word3}`);
        
        const hypeMessage = await generateHypeMessage(word1, word2, word3);
        
        // Default to #general if no custom channel is set
        const dailyChannel = process.env.DAILY_HYPE_CHANNEL || '#general';
        
        await sendToSlackChannel(dailyChannel, `🌅 **Daily Team Hype!** 🌅\n\n${hypeMessage}`);
        
        console.log(`Daily hype sent to ${dailyChannel}: ${hypeMessage}`);
        
    } catch (error) {
        console.error('Failed to send daily hype:', error.response?.data || error.message);
    }
}, {
    timezone: "America/New_York"  // Change this to your timezone
});

app.get('/test', (req, res) => {
    console.log('TEST ROUTE HIT!');
    res.json({ message: 'Server is working!' });
});

app.post('/generate-hype', async (req, res) => {
    console.log('Hype route hit! Request body:', req.body);
    
    try {
        const { word1, word2, word3 } = req.body;
        const hypeMessage = await generateHypeMessage(word1, word2, word3);
        res.json({ message: hypeMessage });
        
    } catch (error) {
        console.log('Error details:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate hype message' });
    }
});

app.post('/slack/send', async (req, res) => {
    console.log('Slack route hit! Request body:', req.body);
    
    try {
        const { channel, word1, word2, word3 } = req.body;
        const hypeMessage = await generateHypeMessage(word1, word2, word3);
        await sendToSlackChannel(channel, hypeMessage);
        
        res.json({ message: 'Hype message sent to Slack!', hype: hypeMessage });
        
    } catch (error) {
        console.log('Slack error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to send to Slack' });
    }
});

// Test the daily hype immediately
app.post('/test-daily-hype', async (req, res) => {
    console.log('Testing daily hype...');
    
    try {
        const { word1, word2, word3 } = getRandomWords();
        const hypeMessage = await generateHypeMessage(word1, word2, word3);
        
        // Use channel from request or default to #general
        const channel = req.body.channel || '#general';
        await sendToSlackChannel(channel, `🧪 **Test Daily Hype!** 🧪\n\n${hypeMessage}`);
        
        res.json({ 
            message: 'Test daily hype sent!', 
            words: { word1, word2, word3 },
            hype: hypeMessage,
            channel: channel
        });
        
    } catch (error) {
        console.log('Test daily hype error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to send test daily hype' });
    }
});

app.use(express.static('.'));

app.listen(PORT, () => {
    console.log(`Hype Bot running on port ${PORT}`);
    console.log('Daily hype scheduled for 9:00 AM Monday-Friday (ET)');
});