import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { createRequestHandler } from 'react-router';
import { createUIResource } from '@mcp-ui/server';

declare module 'react-router' {
  export interface AppLoadContext {
    cloudflare: {
      env: CloudflareEnvironment;
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
);

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: 'MCP-UI Example',
    version: '1.0.0',
  });

  async init() {
    const requestUrl = this.props.requestUrl as string;
    const url = new URL(requestUrl);
    const requestHost = url.host;

    this.server.tool(
      'get_tasks_status',
      'The main way to get a textual representation of the status of all tasks',
      async () => {
        const todayData = {
          alice: { remaining: 12, toDo: 5, inProgress: 4, blocked: 3 },
          bob: { remaining: 18, toDo: 11, inProgress: 4, blocked: 3 },
          charlie: { remaining: 14, toDo: 6, inProgress: 5, blocked: 3 },
        };

        // Full sprint data for weekly summary
        const sprintDataFull = [
          {
            date: '5/10',
            alice: { remaining: 8, toDo: 3, inProgress: 3, blocked: 2 },
            bob: { remaining: 7, toDo: 2, inProgress: 3, blocked: 2 },
            charlie: { remaining: 9, toDo: 4, inProgress: 3, blocked: 2 },
          },
          {
            date: '5/11',
            alice: { remaining: 7, toDo: 2, inProgress: 3, blocked: 2 },
            bob: { remaining: 6, toDo: 2, inProgress: 2, blocked: 2 },
            charlie: { remaining: 8, toDo: 3, inProgress: 3, blocked: 2 },
          },
          {
            date: '5/12',
            alice: { remaining: 9, toDo: 3, inProgress: 4, blocked: 2 },
            bob: { remaining: 8, toDo: 3, inProgress: 3, blocked: 2 },
            charlie: { remaining: 10, toDo: 4, inProgress: 4, blocked: 2 },
          },
          {
            date: '5/13',
            alice: { remaining: 6, toDo: 1, inProgress: 2, blocked: 3 },
            bob: { remaining: 9, toDo: 3, inProgress: 3, blocked: 3 },
            charlie: { remaining: 11, toDo: 5, inProgress: 3, blocked: 3 },
          },
          {
            date: '5/14',
            alice: { remaining: 10, toDo: 4, inProgress: 3, blocked: 3 },
            bob: { remaining: 9, toDo: 3, inProgress: 3, blocked: 3 },
            charlie: { remaining: 12, toDo: 5, inProgress: 4, blocked: 3 },
          },
          {
            date: '5/15',
            alice: { remaining: 11, toDo: 4, inProgress: 4, blocked: 3 },
            bob: { remaining: 10, toDo: 3, inProgress: 4, blocked: 3 },
            charlie: { remaining: 13, toDo: 6, inProgress: 4, blocked: 3 },
          },
          {
            date: '5/16',
            alice: { remaining: 12, toDo: 5, inProgress: 4, blocked: 3 },
            bob: { remaining: 11, toDo: 4, inProgress: 4, blocked: 3 },
            charlie: { remaining: 14, toDo: 6, inProgress: 5, blocked: 3 },
          },
        ];
        const teamMembers = ['alice', 'bob', 'charlie'];

        let statusText = "Today's Task Status:\n\n";

        statusText += 'Alice:\n';
        statusText += `  To Do: ${todayData.alice.toDo}\n`;
        statusText += `  In Progress: ${todayData.alice.inProgress}\n`;
        statusText += `  Blocked: ${todayData.alice.blocked}\n`;
        statusText += `  Remaining: ${todayData.alice.remaining}\n\n`;

        statusText += 'Bob:\n';
        statusText += `  To Do: ${todayData.bob.toDo}\n`;
        statusText += `  In Progress: ${todayData.bob.inProgress}\n`;
        statusText += `  Blocked: ${todayData.bob.blocked}\n`;
        statusText += `  Remaining: ${todayData.bob.remaining}\n\n`;

        statusText += 'Charlie:\n';
        statusText += `  To Do: ${todayData.charlie.toDo}\n`;
        statusText += `  In Progress: ${todayData.charlie.inProgress}\n`;
        statusText += `  Blocked: ${todayData.charlie.blocked}\n`;
        statusText += `  Remaining: ${todayData.charlie.remaining}\n`;

        // Calculate weekly totals
        let weeklyTotalToDo = 0;
        let weeklyTotalInProgress = 0;
        let weeklyTotalBlocked = 0;

        sprintDataFull.forEach((day) => {
          teamMembers.forEach((member) => {
            // @ts-expect-error - member is a string, but it's used as an index type for day
            weeklyTotalToDo += day[member]?.toDo || 0;
            // @ts-expect-error - member is a string, but it's used as an index type for day
            weeklyTotalInProgress += day[member]?.inProgress || 0;
            // @ts-expect-error - member is a string, but it's used as an index type for day
            weeklyTotalBlocked += day[member]?.blocked || 0;
          });
        });

        statusText += '\n\nSummary for the past week:\n';
        statusText += `Total tasks To Do: ${weeklyTotalToDo}\n`;
        statusText += `Total tasks In Progress: ${weeklyTotalInProgress}\n`;
        statusText += `Total tasks Blocked: ${weeklyTotalBlocked}\n`;

        return {
          content: [{ type: 'text', text: statusText }],
        };
      },
    );

    this.server.tool('nudge_team_member', { name: z.string() }, async ({ name }) => ({
      content: [{ type: 'text', text: 'Nudged ' + name + '!' }],
    }));

    this.server.tool(
      'show_task_status',
      'Displays a UI for the user to see the status of tasks. Use get_tasks_status unless asked to SHOW the status',
      async () => {
        const scheme =
          requestHost.includes('localhost') || requestHost.includes('127.0.0.1') ? 'http' : 'https';

        const pickerPageUrl = `${scheme}://${requestHost}/task`;

        // Generate a unique URI for this specific invocation of the file picker UI.
        // This URI identifies the resource block itself, not the content of the iframe.
        const uniqueUIAppUri = `ui://task-manager/${Date.now()}` as `ui://${string}`;
        const resourceBlock = createUIResource({
          uri: uniqueUIAppUri,
          content: { type: 'externalUrl', iframeUrl: pickerPageUrl },
          encoding: 'text', // The URL itself is delivered as text
        });

        return {
          content: [resourceBlock],
        };
      },
    );
    this.server.tool(
      'show_user_status',
      'Displays a UI for the user to see the status of a user and their tasks',
      { id: z.string(), name: z.string(), avatarUrl: z.string() },
      async ({ id, name, avatarUrl }) => {
        const scheme =
          requestHost.includes('localhost') || requestHost.includes('127.0.0.1') ? 'http' : 'https';

        const pickerPageUrl = `${scheme}://${requestHost}/user?id=${id}&name=${name}&avatarUrl=${avatarUrl}`;

        // Generate a unique URI for this specific invocation of the file picker UI.
        // This URI identifies the resource block itself, not the content of the iframe.
        const uniqueUIAppUri = `ui://user-profile/${Date.now()}` as `ui://${string}`;
        const resourceBlock = createUIResource({
          uri: uniqueUIAppUri,
          content: { type: 'externalUrl', iframeUrl: pickerPageUrl },
          encoding: 'text', // The URL itself is delivered as text
        });

        return {
          content: [resourceBlock],
        };
      },
    );

  }
}

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,HEAD,OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    const url = new URL(request.url);
    ctx.props.requestUrl = request.url;

    if (url.pathname === '/sse' || url.pathname === '/sse/message') {
      return MyMCP.serveSSE('/sse').fetch(request, env, ctx);
    }

    if (url.pathname === '/mcp') {
      return MyMCP.serve('/mcp').fetch(request, env, ctx);
    }

    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
    // return new Response("Not found", { status: 404 });
  },
};
