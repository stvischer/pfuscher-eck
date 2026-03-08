export default class Auth {
  #fastify;

  constructur(fastify) {
    fastify.log.info('User plugin loaded');
    this.#fastify = fastify;
  }
}
