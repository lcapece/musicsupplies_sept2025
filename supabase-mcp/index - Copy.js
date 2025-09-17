#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ekklokrukxmqlahtonnc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAwNzMxOTQsImV4cCI6MjA1NTY0OTE5NH0.LFyaAQyBb2l6rxdUAXpDQVZnR4gHDNrVZH0YudbjP3k';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVra2xva3J1a3htcWxhaHRvbm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MDA3MzE5NCwiZXhwIjoyMDU1NjQ5MTk0fQ.VzPGNEdJY6_VvEUTcdcyIUbmSFyJ-xoUOrSPcSlQPCU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const server = new Server(
  {
    name: 'supabase-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler('tools/list', async () => {
  return {
    tools: [
      {
        name: 'query_database',
        description: 'Execute a SELECT query on the Supabase database',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            select: { type: 'string', description: 'Columns to select (default: *)' },
            filters: { type: 'object', description: 'Filter conditions' },
            limit: { type: 'number', description: 'Limit results' }
          },
          required: ['table']
        }
      },
      {
        name: 'insert_data',
        description: 'Insert data into a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            data: { type: 'object', description: 'Data to insert' }
          },
          required: ['table', 'data']
        }
      },
      {
        name: 'update_data',
        description: 'Update data in a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            data: { type: 'object', description: 'Data to update' },
            filters: { type: 'object', description: 'Filter conditions' }
          },
          required: ['table', 'data', 'filters']
        }
      },
      {
        name: 'delete_data',
        description: 'Delete data from a Supabase table',
        inputSchema: {
          type: 'object',
          properties: {
            table: { type: 'string', description: 'Table name' },
            filters: { type: 'object', description: 'Filter conditions' }
          },
          required: ['table', 'filters']
        }
      }
    ]
  };
});

server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'query_database': {
        const query = supabase.from(args.table).select(args.select || '*');
        
        if (args.filters) {
          Object.entries(args.filters).forEach(([key, value]) => {
            query.eq(key, value);
          });
        }
        
        if (args.limit) {
          query.limit(args.limit);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
      
      case 'insert_data': {
        const { data, error } = await supabase
          .from(args.table)
          .insert(args.data)
          .select();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: `Inserted: ${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      }
      
      case 'update_data': {
        const query = supabase.from(args.table).update(args.data);
        
        Object.entries(args.filters).forEach(([key, value]) => {
          query.eq(key, value);
        });
        
        const { data, error } = await query.select();
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: `Updated: ${JSON.stringify(data, null, 2)}`
            }
          ]
        };
      }
      
      case 'delete_data': {
        const query = supabase.from(args.table).delete();
        
        Object.entries(args.filters).forEach(([key, value]) => {
          query.eq(key, value);
        });
        
        const { error } = await query;
        
        if (error) throw error;
        
        return {
          content: [
            {
              type: 'text',
              text: 'Data deleted successfully'
            }
          ]
        };
      }
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);