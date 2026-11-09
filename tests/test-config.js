/**
 * Test configuration with environment variables
 * Supports configurable ports for testing different DSH instances
 */

module.exports = {
  // Hub server port (default 4100)
  hubPort: process.env.DSH_HUB_PORT || '4100',
  
  // DSH web UI port (default 3080, can be overridden)
  dshPort: process.env.DSH_PORT || process.env.DSH_WEB_PORT || '3080',
  
  // Profile name for testing (default pwtest)
  profile: process.env.DSH_PROFILE || 'pwtest',
  
  // Hub API base URL
  get hubUrl() {
    return `http://127.0.0.1:${this.hubPort}`;
  },
  
  // DSH Web UI base URL
  get dshUrl() {
    return `http://127.0.0.1:${this.dshPort}`;
  },
  
  // Auth token
  authToken: process.env.DSH_HUB_TOKEN || 'dev-token'
};
