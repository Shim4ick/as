import type {
  Router,
  WebRtcTransport,
  Producer,
  Consumer,
  RtpCapabilities,
  DtlsParameters,
  MediaKind,
  RtpParameters,
} from "mediasoup/node/lib/types";
import { getNextWorker } from "../media/worker-pool";
import { config } from "../config";
import { logger } from "../utils/logger";

interface Peer {
  userId: string;
  socketId: string;
  sendTransport?: WebRtcTransport;
  recvTransport?: WebRtcTransport;
  producers: Map<string, Producer>;
  consumers: Map<string, Consumer>;
}

export class Room {
  id: string;
  router: Router | null = null;
  peers: Map<string, Peer> = new Map();
  closed = false;

  constructor(id: string) {
    this.id = id;
  }

  async init() {
    const worker = getNextWorker();
    this.router = await worker.createRouter(config.mediasoup.routerOptions);
    logger.info({ roomId: this.id }, "Room router created");
  }

  getRtpCapabilities(): RtpCapabilities {
    return this.router!.rtpCapabilities;
  }

  hasPeer(userId: string): boolean {
    return this.peers.has(userId);
  }

  addPeer(userId: string, socketId: string) {
    const existingPeer = this.peers.get(userId);
    if (existingPeer) {
      if (existingPeer.socketId === socketId) return;

      for (const [, consumer] of existingPeer.consumers) {
        consumer.close();
      }
      for (const [, producer] of existingPeer.producers) {
        producer.close();
      }
      existingPeer.sendTransport?.close();
      existingPeer.recvTransport?.close();
    }

    this.peers.set(userId, {
      userId,
      socketId,
      producers: new Map(),
      consumers: new Map(),
    });
  }

  async createTransport(userId: string, direction: "send" | "recv") {
    const peer = this.peers.get(userId);
    if (!peer || !this.router) throw new Error("Peer or router not found");

    const transport = await this.router.createWebRtcTransport(
      config.mediasoup.webRtcTransportOptions,
    );

    if (direction === "send") {
      peer.sendTransport = transport;
    } else {
      peer.recvTransport = transport;
    }

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  async connectTransport(
    userId: string,
    transportId: string,
    dtlsParameters: DtlsParameters,
  ) {
    const peer = this.peers.get(userId);
    if (!peer) throw new Error("Peer not found");

    const transport =
      peer.sendTransport?.id === transportId
        ? peer.sendTransport
        : peer.recvTransport?.id === transportId
          ? peer.recvTransport
          : null;

    if (!transport) throw new Error("Transport not found");
    await transport.connect({ dtlsParameters });
  }

  async produce(
    userId: string,
    transportId: string,
    kind: MediaKind,
    rtpParameters: RtpParameters,
    appData: Record<string, unknown>,
  ) {
    const peer = this.peers.get(userId);
    if (!peer?.sendTransport || peer.sendTransport.id !== transportId) {
      throw new Error("Send transport not found");
    }

    const producer = await peer.sendTransport.produce({
      kind,
      rtpParameters,
      appData: { ...appData, userId },
    });

    peer.producers.set(producer.id, producer);

    producer.on("transportclose", () => {
      peer.producers.delete(producer.id);
    });

    return producer.id;
  }

  async consume(
    userId: string,
    producerId: string,
    rtpCapabilities: RtpCapabilities,
  ) {
    const peer = this.peers.get(userId);
    if (!peer?.recvTransport || !this.router) {
      throw new Error("Recv transport or router not found");
    }

    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error("Cannot consume");
    }

    const consumer = await peer.recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true,
    });

    peer.consumers.set(consumer.id, consumer);

    consumer.on("transportclose", () => {
      peer.consumers.delete(consumer.id);
    });

    consumer.on("producerclose", () => {
      peer.consumers.delete(consumer.id);
    });

    return {
      id: consumer.id,
      producerId: consumer.producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      appData: consumer.appData,
    };
  }

  async resumeConsumer(userId: string, consumerId: string) {
    const peer = this.peers.get(userId);
    const consumer = peer?.consumers.get(consumerId);
    if (!consumer) throw new Error("Consumer not found");
    await consumer.resume();
  }

  setPreferredLayers(
    userId: string,
    consumerId: string,
    spatialLayer: number,
    temporalLayer: number,
  ) {
    const peer = this.peers.get(userId);
    const consumer = peer?.consumers.get(consumerId);
    if (!consumer) return;
    consumer.setPreferredLayers({ spatialLayer, temporalLayer });
  }

  getOtherProducers(userId: string) {
    const producers: Array<{
      producerId: string;
      userId: string;
      kind: MediaKind;
      appData: Record<string, unknown>;
    }> = [];

    for (const [peerId, peer] of this.peers) {
      if (peerId === userId) continue;
      for (const [, producer] of peer.producers) {
        producers.push({
          producerId: producer.id,
          userId: peerId,
          kind: producer.kind,
          appData: producer.appData as Record<string, unknown>,
        });
      }
    }

    return producers;
  }

  removePeer(userId: string, socketId?: string) {
    const peer = this.peers.get(userId);
    if (!peer) return;
    if (socketId && peer.socketId !== socketId) return;

    for (const [, consumer] of peer.consumers) {
      consumer.close();
    }
    for (const [, producer] of peer.producers) {
      producer.close();
    }
    peer.sendTransport?.close();
    peer.recvTransport?.close();

    this.peers.delete(userId);

    if (this.peers.size === 0) {
      this.close();
    }
  }

  close() {
    this.closed = true;
    this.router?.close();
    logger.info({ roomId: this.id }, "Room closed");
  }

  get peerCount(): number {
    return this.peers.size;
  }
}
