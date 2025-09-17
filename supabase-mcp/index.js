#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Simple JSON-RPC handler
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function send(response) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  try {
    const request = JSON.parse(line);
    
    // Handle initialization
    if (request.method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '1.0.0',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'supabase-mcp',
            version: '1.0.0'
          }
        }
      });
      return;
    }
    
    // Handle tools/list
    if (request.method === 'tools/list') {
      send({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'query_database',
              description: 'Query Supabase database',
              inputSchema: {
                type: 'object',
                properties: {
                  table: { type: 'string', description: 'Table name' }
                },
                required: ['table']
              }
            }
          ]
        }
      });
      return;
    }
    
    // Handle tools/call
    if (request.method === 'tools/call') {
      if (request.params.name === 'query_database') {
        const { data, error } = await supabase
          .from(request.params.arguments.table)
          .select('*')
          .limit(10);
        
        send({
          jsonrpc: '2.0',
          id: request.id,
          result: {
            content: [
              {
                type: 'text',
                text: error ? `Error: ${error.message}` : JSON.stringify(data, null, 2)
              }
            ]
          }
        });
        return;
      }
    }
    
    // Default error response
    send({
      jsonrpc: '2.0',
      id: request.id,
      error: {
        code: -32601,
        message: 'Method not found'
      }
    });
    
  } catch (error) {
    // Silently ignore parse errors
  }
});

// Log to stderr (not stdout which is used for JSON-RPC)
console.error('Supabase MCP server started (direct implementation)');

