module.exports = {
  async onSuccess({ constants }) {
    const token = process.env.NETLIFY_PURGE_TOKEN;
    if (!token) {
      console.log('NETLIFY_PURGE_TOKEN not set, skipping cache purge');
      return;
    }

    try {
      const response = await fetch('https://api.netlify.com/api/v1/purge', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ site_id: constants.SITE_ID }),
      });

      if (response.ok) {
        console.log('Netlify Durable Cache purged successfully');
      } else {
        console.log('Cache purge failed:', response.status, await response.text());
      }
    } catch (error) {
      console.log('Cache purge error:', error.message);
    }
  },
};
