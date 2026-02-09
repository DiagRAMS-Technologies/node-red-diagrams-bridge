import { type Node, type NodeAPI, type NodeDef } from 'node-red';

export type Credentials = {
  applicationId: string;
  applicationSecret: string;
};

export type Properties = {
  name: string;
};

export type DiagRAMSCredentialsNode = Node<Credentials> & Credentials;

function main(RED: NodeAPI) {
  function DiagRAMSCredentials(
    this: DiagRAMSCredentialsNode,
    config: NodeDef & Properties,
  ) {
    RED.nodes.createNode(this, config);

    if (
      this.credentials &&
      this.credentials.applicationId &&
      this.credentials.applicationSecret
    ) {
      this.error('Credentials ready!');
      this.applicationId = this.credentials.applicationId;
      this.applicationSecret = this.credentials.applicationSecret;
      return;
    }

    this.error('Bad credentials!');
    this.debug(JSON.stringify(this.credentials));
  }

  RED.nodes.registerType('diagrams-credentials', DiagRAMSCredentials, {
    credentials: {
      applicationId: { type: 'text' },
      applicationSecret: { type: 'password' },
    },
  });
}

export default main;
