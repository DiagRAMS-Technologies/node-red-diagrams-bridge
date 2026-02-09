import { type Node, type NodeAPI, type NodeDef } from 'node-red';
import { type Credentials } from './credentials.js';
import { printStackTrace } from 'yerror';

export type Data = {
  sensorId: string;
  valueName: string;
  date: string;
  value: number;
  precision?: number;
}[];

export type Properties = {
  projectCode: string;
  organisationId: string;
  baseURL: string;
  diagrams: string;
};

export type DiagRAMSBridgeNode = Node;

function main(RED: NodeAPI) {
  function DiagRAMSBridge(
    this: DiagRAMSBridgeNode,
    config: NodeDef & Properties,
  ) {
    RED.nodes.createNode(this, config);

    let token = null;
    const projectCode = config.projectCode;
    const organisationId = config.organisationId;
    const baseURL = config.baseURL;
    const credentials = RED.nodes.getCredentials(
      config.diagrams,
    ) as Credentials;

    this.on('input', (msg) => {
      (async () => {
        try {
          if (!token) {
            const request = {
              method: 'POST',
              headers: {
                authorization: `basic ${Buffer.from(
                  `${credentials.applicationId}:${credentials.applicationSecret}`,
                ).toString('base64')}`,
                'content-type': 'application/json',
              },
              body: JSON.stringify({ grant_type: 'client_credentials' }),
            };
            const response = await fetch(`${baseURL}/oauth2/token`, request);

            if (response.status !== 200) {
              this.error(
                'Unable to get a token: ' + (await response.text()),
                msg,
              );
              this.debug(JSON.stringify(request));
              this.status({ fill: 'red', shape: 'ring', text: 'token:failed' });
              return;
            }

            this.status({ fill: 'green', shape: 'dot', text: 'token:ready' });

            token = (await response.json()).access_token || null;
          }

          const request = {
            method: 'POST',
            headers: {
              authorization: `bearer ${token}`,
              'content-type': 'application/json',
            },
            body: JSON.stringify(msg.payload),
          };
          const response = await fetch(
            `${baseURL}/organisations/${organisationId}/data/${projectCode}`,
            request,
          );

          if (response.status === 401) {
            this.error('Unauthorized!', msg);
            this.status({ fill: 'red', shape: 'ring', text: 'token:invalid' });
            token = null;
            this.debug(JSON.stringify(request));
            return;
          }

          if (response.status !== 201) {
            this.error(
              'Unable to send the data: ' + (await response.text()),
              msg,
            );
            this.debug(JSON.stringify(request));
            this.status({ fill: 'red', shape: 'dot', text: 'data:failing' });
            return;
          }
          this.status({ fill: 'green', shape: 'dot', text: 'data:sending' });
        } catch (err) {
          this.error(printStackTrace(err as Error));
          this.status({ fill: 'red', shape: 'dot', text: 'node:erroring' });
        }
      })();
    });

    this.status({ fill: 'grey', shape: 'ring', text: 'token:pristine' });
  }

  RED.nodes.registerType('diagrams-bridge', DiagRAMSBridge);
}

export default main;
