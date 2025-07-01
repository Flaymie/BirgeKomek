import express from 'express';

const router = express.Router();

// @route   GET /api/config/dadata-key
// @desc    Get DaData API key
// @access  Private
router.get('/dadata-key', (req, res) => {
    try {
        const apiKey = process.env.DADATA_API_KEY;
        if (!apiKey) {
            console.error('DADATA_API_KEY not found in environment variables');
            return res.status(500).send('Server configuration error');
        }
        res.json({ apiKey });
    } catch (error) {
        console.error('Error fetching DaData API key:', error);
        res.status(500).send('Server Error');
    }
});

export default router; 