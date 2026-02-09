import { type Node, type NodeDef, type NodeAPI } from 'node-red';
import { jest, describe, beforeEach, test, expect } from '@jest/globals';
import DiagRAMSBridge, { Properties } from './index.js';
import { EventEmitter } from 'events';
import nock from 'nock';

describe('DiagRAMSBridge', () => {
  const PROPERTIES: Properties = {
    organisationId: 'abbab0b0-b0b0-b0b0-b0b0-abbacacacaca',
    projectCode: 'demo',
    baseURL: 'https://api.diagrams-technologies.com/v0',
    diagrams: 'credentials_id',
  };
  const RED = {
    nodes: {
      createNode: jest.fn<NodeAPI['nodes']['createNode']>(),
      registerType: jest.fn<NodeAPI['nodes']['registerType']>(),
      getCredentials: jest.fn<NodeAPI['nodes']['getCredentials']>(),
    },
  };
  const send = jest.fn<Node<object>['send']>();
  const error = jest.fn<Node<object>['error']>();
  const debug = jest.fn<Node<object>['debug']>();
  const status = jest.fn<Node<object>['status']>();

  function spawnEmitter() {
    const emitter = new EventEmitter() as unknown as EventEmitter & {
      send: Node<object>['send'];
      error: Node<object>['error'];
      debug: Node<object>['debug'];
      status: Node<object>['status'];
    };

    emitter.send = send;
    emitter.error = error;
    emitter.debug = debug;
    emitter.status = status;

    return emitter;
  }

  beforeEach(() => {
    RED.nodes.createNode.mockClear();
    RED.nodes.registerType.mockClear();
    RED.nodes.getCredentials.mockClear();
    send.mockClear();
    error.mockClear();
    debug.mockClear();
    status.mockClear();
  });

  test('should work with a good payload', async () => {
    RED.nodes.getCredentials.mockReturnValueOnce({
      applicationId: 'abbacaca-b0b0-b0b0-b0b0-abbacacacaca',
      applicationSecret: 'this_is_a_secret',
    });
    DiagRAMSBridge(RED as unknown as NodeAPI);

    const [[, diagRAMSBridgeNode]] = RED.nodes.registerType.mock.calls;
    const emitter = spawnEmitter();

    diagRAMSBridgeNode.apply(emitter as unknown as Node<object>, [
      PROPERTIES as unknown as NodeDef,
    ]);

    const tokenStatusPromise = new Promise<void>((resolve) => {
      status.mockImplementationOnce((status) => {
        resolve();
        return status;
      });
    });
    const dataStatusPromise = new Promise<void>((resolve) => {
      status.mockImplementationOnce((status) => {
        resolve();
        return status;
      });
    });

    nock('https://api.diagrams-technologies.com')
      .post('/v0/oauth2/token')
      .reply(200, {
        access_token: 'xxx.yyy.zzz',
        token_type: 'bearer',
        expires_in: 172800,
        expiration_date: '2021-10-27T12:06:28.828Z',
        refresh_token: 'xxxyyyzzzz==',
        refresh_token_expires_in: 31557600,
        refresh_token_expiration_date: '2022-10-25T18:06:28.849Z',
      });
    nock('https://api.diagrams-technologies.com')
      .post(
        `/v0/organisations/${PROPERTIES.organisationId}/data/${PROPERTIES.projectCode}`,
      )
      .reply(201, {});

    emitter.emit('input', {
      payload: [
        {
          sensorId: 'rpi-accel',
          valueName: 'y',
          date: '2026-02-06T08:13:51.000Z',
          value: 199.9,
          precision: 100,
        },
      ],
    });

    await tokenStatusPromise;
    await dataStatusPromise;

    expect(send.mock.calls).toMatchInlineSnapshot(`[]`);
    expect(error.mock.calls).toMatchInlineSnapshot(`[]`);
    expect(status.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "fill": "grey",
      "shape": "ring",
      "text": "token:pristine",
    },
  ],
  [
    {
      "fill": "green",
      "shape": "dot",
      "text": "token:ready",
    },
  ],
  [
    {
      "fill": "green",
      "shape": "dot",
      "text": "data:sending",
    },
  ],
]
`);
    expect(debug.mock.calls).toMatchInlineSnapshot(`[]`);
    expect(RED.nodes.createNode.mock.calls).toMatchInlineSnapshot(`
[
  [
    EventEmitter {
      "_events": {
        "input": [Function],
      },
      "_eventsCount": 1,
      "_maxListeners": undefined,
      "debug": [MockFunction],
      "error": [MockFunction],
      "send": [MockFunction],
      "status": [MockFunction] {
        "calls": [
          [
            {
              "fill": "grey",
              "shape": "ring",
              "text": "token:pristine",
            },
          ],
          [
            {
              "fill": "green",
              "shape": "dot",
              "text": "token:ready",
            },
          ],
          [
            {
              "fill": "green",
              "shape": "dot",
              "text": "data:sending",
            },
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": {
              "fill": "green",
              "shape": "dot",
              "text": "token:ready",
            },
          },
          {
            "type": "return",
            "value": {
              "fill": "green",
              "shape": "dot",
              "text": "data:sending",
            },
          },
        ],
      },
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
    },
    {
      "baseURL": "https://api.diagrams-technologies.com/v0",
      "diagrams": "credentials_id",
      "organisationId": "abbab0b0-b0b0-b0b0-b0b0-abbacacacaca",
      "projectCode": "demo",
    },
  ],
]
`);
    expect(RED.nodes.registerType.mock.calls).toMatchInlineSnapshot(`
[
  [
    "diagrams-bridge",
    [Function],
  ],
]
`);
    expect(RED.nodes.getCredentials.mock.calls).toMatchInlineSnapshot(`
[
  [
    "credentials_id",
  ],
]
`);
  });

  test('should fail with bad credentials', async () => {
    RED.nodes.getCredentials.mockReturnValueOnce({
      applicationId: 'abbacaca-b0b0-b0b0-b0b0-abbacacacaca',
      applicationSecret: 'this_is_a_bad_secret',
    });
    DiagRAMSBridge(RED as unknown as NodeAPI);

    const [[, diagRAMSBridgeNode]] = RED.nodes.registerType.mock.calls;
    const emitter = spawnEmitter();

    diagRAMSBridgeNode.apply(emitter as unknown as Node<object>, [
      { ...PROPERTIES, diagrams: 'bad_credentials_id' } as unknown as NodeDef,
    ]);

    const tokenStatusPromise = new Promise<void>((resolve) => {
      status.mockImplementationOnce((status) => {
        resolve();
        return status;
      });
    });

    nock('https://api.diagrams-technologies.com')
      .post('/v0/oauth2/token')
      .reply(403, {});

    emitter.emit('input', {
      payload: [
        {
          sensorId: 'rpi-accel',
          valueName: 'y',
          date: '2026-02-06T08:13:51.000Z',
          value: 199.9,
          precision: 100,
        },
      ],
    });

    await tokenStatusPromise;

    expect(send.mock.calls).toMatchInlineSnapshot(`[]`);
    expect(error.mock.calls).toMatchInlineSnapshot(`
[
  [
    "Unable to get a token: {}",
    {
      "payload": [
        {
          "date": "2026-02-06T08:13:51.000Z",
          "precision": 100,
          "sensorId": "rpi-accel",
          "value": 199.9,
          "valueName": "y",
        },
      ],
    },
  ],
]
`);
    expect(status.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "fill": "grey",
      "shape": "ring",
      "text": "token:pristine",
    },
  ],
  [
    {
      "fill": "red",
      "shape": "ring",
      "text": "token:failed",
    },
  ],
]
`);
    expect(debug.mock.calls).toMatchInlineSnapshot(`
[
  [
    "{"method":"POST","headers":{"authorization":"basic YWJiYWNhY2EtYjBiMC1iMGIwLWIwYjAtYWJiYWNhY2FjYWNhOnRoaXNfaXNfYV9iYWRfc2VjcmV0","content-type":"application/json"},"body":"{\\"grant_type\\":\\"client_credentials\\"}"}",
  ],
]
`);
    expect(RED.nodes.createNode.mock.calls).toMatchInlineSnapshot(`
[
  [
    EventEmitter {
      "_events": {
        "input": [Function],
      },
      "_eventsCount": 1,
      "_maxListeners": undefined,
      "debug": [MockFunction] {
        "calls": [
          [
            "{"method":"POST","headers":{"authorization":"basic YWJiYWNhY2EtYjBiMC1iMGIwLWIwYjAtYWJiYWNhY2FjYWNhOnRoaXNfaXNfYV9iYWRfc2VjcmV0","content-type":"application/json"},"body":"{\\"grant_type\\":\\"client_credentials\\"}"}",
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
        ],
      },
      "error": [MockFunction] {
        "calls": [
          [
            "Unable to get a token: {}",
            {
              "payload": [
                {
                  "date": "2026-02-06T08:13:51.000Z",
                  "precision": 100,
                  "sensorId": "rpi-accel",
                  "value": 199.9,
                  "valueName": "y",
                },
              ],
            },
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
        ],
      },
      "send": [MockFunction],
      "status": [MockFunction] {
        "calls": [
          [
            {
              "fill": "grey",
              "shape": "ring",
              "text": "token:pristine",
            },
          ],
          [
            {
              "fill": "red",
              "shape": "ring",
              "text": "token:failed",
            },
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": {
              "fill": "red",
              "shape": "ring",
              "text": "token:failed",
            },
          },
        ],
      },
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
    },
    {
      "baseURL": "https://api.diagrams-technologies.com/v0",
      "diagrams": "bad_credentials_id",
      "organisationId": "abbab0b0-b0b0-b0b0-b0b0-abbacacacaca",
      "projectCode": "demo",
    },
  ],
]
`);
    expect(RED.nodes.registerType.mock.calls).toMatchInlineSnapshot(`
[
  [
    "diagrams-bridge",
    [Function],
  ],
]
`);
    expect(RED.nodes.getCredentials.mock.calls).toMatchInlineSnapshot(`
[
  [
    "bad_credentials_id",
  ],
]
`);
  });

  test('should fail with invalid token', async () => {
    RED.nodes.getCredentials.mockReturnValueOnce({
      applicationId: 'abbacaca-b0b0-b0b0-b0b0-abbacacacaca',
      applicationSecret: 'this_is_a_good_secret',
    });
    DiagRAMSBridge(RED as unknown as NodeAPI);

    const [[, diagRAMSBridgeNode]] = RED.nodes.registerType.mock.calls;
    const emitter = spawnEmitter();

    diagRAMSBridgeNode.apply(emitter as unknown as Node<object>, [
      PROPERTIES as unknown as NodeDef,
    ]);

    const tokenStatusPromise = new Promise<void>((resolve) => {
      status.mockImplementationOnce((status) => {
        resolve();
        return status;
      });
    });
    const dataStatusPromise = new Promise<void>((resolve) => {
      status.mockImplementationOnce((status) => {
        resolve();
        return status;
      });
    });

    nock('https://api.diagrams-technologies.com')
      .post('/v0/oauth2/token')
      .reply(200, {
        access_token: 'xxx.yyy.zzz',
        token_type: 'bearer',
        expires_in: 172800,
        expiration_date: '2021-10-27T12:06:28.828Z',
        refresh_token: 'xxxyyyzzzz==',
        refresh_token_expires_in: 31557600,
        refresh_token_expiration_date: '2022-10-25T18:06:28.849Z',
      });
    nock('https://api.diagrams-technologies.com')
      .post(
        `/v0/organisations/${PROPERTIES.organisationId}/data/${PROPERTIES.projectCode}`,
      )
      .reply(401, {});

    emitter.emit('input', {
      payload: [
        {
          sensorId: 'rpi-accel',
          valueName: 'y',
          date: '2026-02-06T08:13:51.000Z',
          value: 199.9,
          precision: 100,
        },
      ],
    });

    await tokenStatusPromise;
    await dataStatusPromise;

    expect(send.mock.calls).toMatchInlineSnapshot(`[]`);
    expect(error.mock.calls).toMatchInlineSnapshot(`
[
  [
    "Unauthorized!",
    {
      "payload": [
        {
          "date": "2026-02-06T08:13:51.000Z",
          "precision": 100,
          "sensorId": "rpi-accel",
          "value": 199.9,
          "valueName": "y",
        },
      ],
    },
  ],
]
`);
    expect(status.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "fill": "grey",
      "shape": "ring",
      "text": "token:pristine",
    },
  ],
  [
    {
      "fill": "green",
      "shape": "dot",
      "text": "token:ready",
    },
  ],
  [
    {
      "fill": "red",
      "shape": "ring",
      "text": "token:invalid",
    },
  ],
]
`);
    expect(debug.mock.calls).toMatchInlineSnapshot(`
[
  [
    "{"method":"POST","headers":{"authorization":"bearer xxx.yyy.zzz","content-type":"application/json"},"body":"[{\\"sensorId\\":\\"rpi-accel\\",\\"valueName\\":\\"y\\",\\"date\\":\\"2026-02-06T08:13:51.000Z\\",\\"value\\":199.9,\\"precision\\":100}]"}",
  ],
]
`);
    expect(RED.nodes.createNode.mock.calls).toMatchInlineSnapshot(`
[
  [
    EventEmitter {
      "_events": {
        "input": [Function],
      },
      "_eventsCount": 1,
      "_maxListeners": undefined,
      "debug": [MockFunction] {
        "calls": [
          [
            "{"method":"POST","headers":{"authorization":"bearer xxx.yyy.zzz","content-type":"application/json"},"body":"[{\\"sensorId\\":\\"rpi-accel\\",\\"valueName\\":\\"y\\",\\"date\\":\\"2026-02-06T08:13:51.000Z\\",\\"value\\":199.9,\\"precision\\":100}]"}",
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
        ],
      },
      "error": [MockFunction] {
        "calls": [
          [
            "Unauthorized!",
            {
              "payload": [
                {
                  "date": "2026-02-06T08:13:51.000Z",
                  "precision": 100,
                  "sensorId": "rpi-accel",
                  "value": 199.9,
                  "valueName": "y",
                },
              ],
            },
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
        ],
      },
      "send": [MockFunction],
      "status": [MockFunction] {
        "calls": [
          [
            {
              "fill": "grey",
              "shape": "ring",
              "text": "token:pristine",
            },
          ],
          [
            {
              "fill": "green",
              "shape": "dot",
              "text": "token:ready",
            },
          ],
          [
            {
              "fill": "red",
              "shape": "ring",
              "text": "token:invalid",
            },
          ],
        ],
        "results": [
          {
            "type": "return",
            "value": undefined,
          },
          {
            "type": "return",
            "value": {
              "fill": "green",
              "shape": "dot",
              "text": "token:ready",
            },
          },
          {
            "type": "return",
            "value": {
              "fill": "red",
              "shape": "ring",
              "text": "token:invalid",
            },
          },
        ],
      },
      Symbol(shapeMode): false,
      Symbol(kCapture): false,
    },
    {
      "baseURL": "https://api.diagrams-technologies.com/v0",
      "diagrams": "credentials_id",
      "organisationId": "abbab0b0-b0b0-b0b0-b0b0-abbacacacaca",
      "projectCode": "demo",
    },
  ],
]
`);
    expect(RED.nodes.registerType.mock.calls).toMatchInlineSnapshot(`
[
  [
    "diagrams-bridge",
    [Function],
  ],
]
`);
    expect(RED.nodes.getCredentials.mock.calls).toMatchInlineSnapshot(`
[
  [
    "credentials_id",
  ],
]
`);
  });

  test('should handle network errors gracefully', async () => {
    RED.nodes.getCredentials.mockReturnValueOnce({
      applicationId: 'abbacaca-b0b0-b0b0-b0b0-abbacacacaca',
      applicationSecret: 'this_is_a_secret',
    });
    DiagRAMSBridge(RED as unknown as NodeAPI);

    const [[, diagRAMSBridgeNode]] = RED.nodes.registerType.mock.calls;
    const emitter = spawnEmitter();

    diagRAMSBridgeNode.apply(emitter as unknown as Node<object>, [
      PROPERTIES as unknown as NodeDef,
    ]);

    const errorStatusPromise = new Promise<void>((resolve) => {
      status.mockImplementationOnce((status) => {
        resolve();
        return status;
      });
    });

    nock('https://api.diagrams-technologies.com')
      .post('/v0/oauth2/token')
      .replyWithError('Network error');

    emitter.emit('input', {
      payload: [
        {
          sensorId: 'rpi-accel',
          valueName: 'y',
          date: '2026-02-06T08:13:51.000Z',
          value: 199.9,
          precision: 100,
        },
      ],
    });

    await errorStatusPromise;

    expect(send.mock.calls).toMatchInlineSnapshot(`[]`);
    expect(error.mock.calls.length).toBeGreaterThan(0);
    expect(status.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "fill": "grey",
      "shape": "ring",
      "text": "token:pristine",
    },
  ],
  [
    {
      "fill": "red",
      "shape": "dot",
      "text": "node:erroring",
    },
  ],
]
`);
  });

  test('should handle invalid response status on data send', async () => {
    RED.nodes.getCredentials.mockReturnValueOnce({
      applicationId: 'abbacaca-b0b0-b0b0-b0b0-abbacacacaca',
      applicationSecret: 'this_is_a_secret',
    });
    DiagRAMSBridge(RED as unknown as NodeAPI);

    const [[, diagRAMSBridgeNode]] = RED.nodes.registerType.mock.calls;
    const emitter = spawnEmitter();

    diagRAMSBridgeNode.apply(emitter as unknown as Node<object>, [
      PROPERTIES as unknown as NodeDef,
    ]);

    const tokenStatusPromise = new Promise<void>((resolve) => {
      status.mockImplementationOnce((status) => {
        resolve();
        return status;
      });
    });
    const dataStatusPromise = new Promise<void>((resolve) => {
      status.mockImplementationOnce((status) => {
        resolve();
        return status;
      });
    });

    nock('https://api.diagrams-technologies.com')
      .post('/v0/oauth2/token')
      .reply(200, {
        access_token: 'xxx.yyy.zzz',
        token_type: 'bearer',
        expires_in: 172800,
        expiration_date: '2021-10-27T12:06:28.828Z',
        refresh_token: 'xxxyyyzzzz==',
        refresh_token_expires_in: 31557600,
        refresh_token_expiration_date: '2022-10-25T18:06:28.849Z',
      });
    nock('https://api.diagrams-technologies.com')
      .post(
        `/v0/organisations/${PROPERTIES.organisationId}/data/${PROPERTIES.projectCode}`,
      )
      .reply(500, { error: 'Internal Server Error' });

    emitter.emit('input', {
      payload: [
        {
          sensorId: 'rpi-accel',
          valueName: 'y',
          date: '2026-02-06T08:13:51.000Z',
          value: 199.9,
          precision: 100,
        },
      ],
    });

    await tokenStatusPromise;
    await dataStatusPromise;

    expect(send.mock.calls).toMatchInlineSnapshot(`[]`);
    expect(error.mock.calls.length).toBeGreaterThan(0);
    expect(error.mock.calls[0][0]).toContain('Unable to send the data');
    expect(status.mock.calls).toMatchInlineSnapshot(`
[
  [
    {
      "fill": "grey",
      "shape": "ring",
      "text": "token:pristine",
    },
  ],
  [
    {
      "fill": "green",
      "shape": "dot",
      "text": "token:ready",
    },
  ],
  [
    {
      "fill": "red",
      "shape": "dot",
      "text": "data:failing",
    },
  ],
]
`);
    expect(debug.mock.calls.length).toBeGreaterThan(0);
  });
});
