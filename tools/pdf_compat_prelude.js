// Promise.withResolvers is missing on older iPad/Safari versions. This prelude
// runs before PDF.js initializes, in both the page and the dedicated worker.
if (typeof Promise.withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value: function () {
      let resolve, reject;
      const promise = new this((res, rej) => { resolve = res; reject = rej; });
      return { promise, resolve, reject };
    }
  });
}
