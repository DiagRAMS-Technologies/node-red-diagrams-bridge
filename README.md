# Node-RED DiagRAMS Bridge

A Node-RED node to push your data to the DiagRAMS API.

## Documentation

- [DiagRAMS API](https://docs.diagrams-technologies.com/)
- [DiagRAMS App](https://app.diagrams-technologies.com/)
- [Node-RED docs](https://nodered.org/docs/)

## Getting started

First of all, download the package. Then, import it in your Node-RED web interface.

To do so, click on the hamburger menu on the right top of the screen, select "Manage Palette", select the "Install" tab, click on the upload icon and select the downloaded package.

The DiagRAMS bridge node will be in your palette in the "function" category.

To use it, just create an application in your DiagRAMS application and put it in the credentials. You will also need to provide the organisation identifier, your project code and the API base URL if running on premise.

## Development

Use docker to spawn your local Node-RED instance:

```sh
docker run -it -p 1880:1880 --name mynodered nodered/node-red
```

Install dependencies:
```sh
npm i
```

## Build & Package

Builds the module and creates a .tgz package in the current directory.

```sh
npm run build
npm pack
```
