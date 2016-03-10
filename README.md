# Browsers RFC 6265 compatibility research - http://inikulin.github.io/cookie-compat.

## To run tests locally
You will need Node.js 4+ and npm installed.

Run:

```sh
git clone https://github.com/inikulin/cookie-compat.git
cd cookie-compat && npm install && npm link
```

Add contents of `data/hosts` file to your system `hosts`.

Run:

```sh
cookie-compat
```

Open provided link in your browser and you're set.
To save results to `data/results.json` so they appear on the results web page start runner with the `--save` flag:
```sh
cookie-compat --save
```

## Author
[Ivan Nikulin](https://github.com/inikulin) (ifaaan@gmail.com)