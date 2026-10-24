import type { NextConfig } from "next";

const svgrOptions = {
  svgoConfig: {
    plugins: [
      {
        name: "preset-default",
        params: { overrides: { removeViewBox: false } },
      },
    ],
  },
};

const nextConfig: NextConfig = {
  // Self-contained server for the Docker image (see Dockerfile).
  output: "standalone",
  async redirects() {
    return [
      // The Stats tabs used to be separate routes. They're now one page at
      // /stats that switches tabs in place, so old links land there.
      {
        source: "/stats/:tab(effort|accuracy|progress)",
        destination: "/stats",
        permanent: false,
      },

      // One focus timer. The legacy timer's routes (and the two aliases older builds and shared links used) are gone, so
      // they redirect server-side with a 301 to the new timer. A link that carries a task id keeps it, so a saved bookmark
      // or a push notification from before the change still opens the right task. Everything else lands on a standalone timer.
      { source: "/home/session", has: [{ type: "query", key: "taskId", value: "(?<taskId>[0-9a-fA-F-]{36})" }], destination: "/focus/start?origin=planner&id=:taskId", statusCode: 301 },
      { source: "/revision-session", has: [{ type: "query", key: "taskId", value: "(?<taskId>[0-9a-fA-F-]{36})" }], destination: "/focus/start?origin=revision_tab&id=:taskId", statusCode: 301 },
      { source: "/revision-session/complete", has: [{ type: "query", key: "taskId", value: "(?<taskId>[0-9a-fA-F-]{36})" }], destination: "/focus/start?origin=revision_tab&id=:taskId", statusCode: 301 },
      { source: "/home/session", destination: "/focus/start?origin=standalone", statusCode: 301 },
      { source: "/home/session/welcome-back", destination: "/focus/start?origin=standalone", statusCode: 301 },
      { source: "/revision-session", destination: "/focus/start?origin=standalone", statusCode: 301 },
      { source: "/revision-session/complete", destination: "/focus/start?origin=standalone", statusCode: 301 },
      { source: "/focus/legacy", destination: "/focus/start?origin=standalone", statusCode: 301 },
      { source: "/timer/old", destination: "/focus/start?origin=standalone", statusCode: 301 },
      { source: "/focus", destination: "/focus/start?origin=standalone", statusCode: 301 },
    ];
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: [
          {
            loader: "@svgr/webpack",
            options: svgrOptions,
          },
        ],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    const fileLoaderRule = config.module.rules.find(
      (rule: { test?: RegExp }) => rule.test?.test?.(".svg")
    );

    config.module.rules.push(
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/,
      },
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] },
        use: [{ loader: "@svgr/webpack", options: svgrOptions }],
      }
    );

    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
};

export default nextConfig;
