# AegisX Boilerplate

<a a### Core Features

- [🗄️ **Database Integration**](./docs/database.md) - Complete PostgreSQL + Knex.js setup
- [⚡ **Quick Start Guide**](./docs/database-quickstart.md) - Get running in 5 minutes  
- [📝 **API Examples**](./docs/database-examples.md) - CRUD, transactions, advanced queries
- [🐳 **Docker Setup**](./docs/docker.md) - Complete Docker guide & container management
- [� **Docker Quick Start**](./docs/docker-quickstart.md) - Get Docker running in 2 minutes
- [�🔒 **Environment Config**](./.env.example) - Configuration referencelogo" href="https://nx.dev" target="_blank" rel="noreferrer"><img src="https://raw.githubusercontent.com/nrwl/nx/master/images/nx-logo.png" width="45"></a>

A production-ready Fastify API boilerplate built with Nx, TypeScript, and PostgreSQL.

## 🚀 Quick Start

```bash
# 1. Setup environment
cp .env.example .env

# 2. Start database
docker-compose up -d postgres

# 3. Start development server
npx nx serve api
```

**🌐 Access Points:**
- **API Server**: http://localhost:3000
- **API Documentation**: http://localhost:3000/docs
- **Database Admin**: http://localhost:8080 (pgAdmin)

## 📚 Documentation

### Core Features

- [🗄️ **Database Integration**](./docs/database.md) - Complete PostgreSQL + Knex.js setup
- [⚡ **Quick Start Guide**](./docs/database-quickstart.md) - Get running in 5 minutes  
- [� **API Examples**](./docs/database-examples.md) - CRUD, transactions, advanced queries
- [�🐳 **Docker Setup**](./docker/README.md) - PostgreSQL + pgAdmin containers
- [🔒 **Environment Config**](./.env.example) - Configuration reference

### API Features

- ✅ **Fastify Framework** - High-performance web framework
- ✅ **PostgreSQL Database** - Full ACID compliance with Knex.js
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **API Documentation** - Swagger/OpenAPI 3.0
- ✅ **Rate Limiting** - DDoS protection  
- ✅ **File Uploads** - Multipart form support
- ✅ **WebSocket Support** - Real-time communication
- ✅ **Health Monitoring** - Circuit breaker patterns
- ✅ **Security Headers** - Helmet integration
- ✅ **Response Compression** - Bandwidth optimization

## 🛠️ Development

### Run tasks

To run the dev server for your app, use:

```sh
npx nx serve api
```

To create a production bundle:

```sh
npx nx build api
```

To see all available targets to run for a project, run:

```sh
npx nx show project api
```

These targets are either [inferred automatically](https://nx.dev/concepts/inferred-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) or defined in the `project.json` or `package.json` files.

[More about running tasks in the docs &raquo;](https://nx.dev/features/run-tasks?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Add new projects

While you could add new projects to your workspace manually, you might want to leverage [Nx plugins](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) and their [code generation](https://nx.dev/features/generate-code?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) feature.

Use the plugin's generator to create new projects.

To generate a new application, use:

```sh
npx nx g @nx/node:app demo
```

To generate a new library, use:

```sh
npx nx g @nx/node:lib mylib
```

You can use `npx nx list` to get a list of installed plugins. Then, run `npx nx list <plugin-name>` to learn about more specific capabilities of a particular plugin. Alternatively, [install Nx Console](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) to browse plugins and generators in your IDE.

[Learn more about Nx plugins &raquo;](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects) | [Browse the plugin registry &raquo;](https://nx.dev/plugin-registry?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)


[Learn more about Nx on CI](https://nx.dev/ci/intro/ci-with-nx#ready-get-started-with-your-provider?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Install Nx Console

Nx Console is an editor extension that enriches your developer experience. It lets you run tasks, generate code, and improves code autocompletion in your IDE. It is available for VSCode and IntelliJ.

[Install Nx Console &raquo;](https://nx.dev/getting-started/editor-setup?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

## Useful links

Learn more:

- [Learn more about this workspace setup](https://nx.dev/nx-api/node?utm_source=nx_project&amp;utm_medium=readme&amp;utm_campaign=nx_projects)
- [Learn about Nx on CI](https://nx.dev/ci/intro/ci-with-nx?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [Releasing Packages with Nx release](https://nx.dev/features/manage-releases?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
- [What are Nx plugins?](https://nx.dev/concepts/nx-plugins?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)

And join the Nx community:
- [Discord](https://go.nx.dev/community)
- [Follow us on X](https://twitter.com/nxdevtools) or [LinkedIn](https://www.linkedin.com/company/nrwl)
- [Our Youtube channel](https://www.youtube.com/@nxdevtools)
- [Our blog](https://nx.dev/blog?utm_source=nx_project&utm_medium=readme&utm_campaign=nx_projects)
