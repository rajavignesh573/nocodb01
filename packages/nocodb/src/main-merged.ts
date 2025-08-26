#!/usr/bin/env node

import { startMergedServer } from './merged-server';

// Start the merged server
startMergedServer().catch((error) => {
  console.error('Failed to start merged server:', error);
  process.exit(1);
});
