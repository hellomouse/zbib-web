import load from 'load-script';
import { getStyleProperties } from './common/citation-style';
import supportedLocales from '../../data/supported-locales.json';
import { pickBestLocale } from './utils';
import { mapObject } from './immutable';

const isWasmSupported = typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function';
var Driver = null;

class Fetcher {
	async fetchLocale(lang) {
		const cacheId = `zotero-style-locales-${lang}`;
		var locales = localStorage.getItem(cacheId);

		// fix in place for scenarios where potentially bad locales have been cached
		// see issue #236
		if(typeof locales === 'string' && !locales.startsWith('<?xml')) {
			locales = false;
		}

		if(locales) {
			return locales;
		} else {
			const response = await fetch(`/static/locales/locales-${lang}.xml`);
			const locales = await response.text();
			localStorage.setItem(cacheId, locales);
			return locales;
		}
	}
}

const retrieveLocaleSync = lang => {
	const cacheId = `zotero-style-locales-${lang}`;
	var locales = localStorage.getItem(cacheId);

	// fix in place for scenarios where potentially bad locales have been cached
	// see issue #236
	if(typeof locales === 'string' && !locales.startsWith('<?xml')) {
		locales = false;
	}

	if(!locales) {
		const url = `/static/locales/locales-${lang}.xml`;
		try {
			locales = syncRequestAsText(url);
			localStorage.setItem(cacheId, locales);
		} catch(e) {
			if(!locales) {
				throw new Error(`Failed to load locales ${lang}`);
			}
		}
	}
	return locales;
};

const fixCitesCompatiblity = cites => {
	return cites.map(cluster => {
		if(cluster.mode === 'SuppressAuthor') {
			cluster['suppress-author'] = true;
		}
		delete cluster.mode;
		return cluster;
	});
}

const syncRequestAsText = url => {
	let xhr = new XMLHttpRequest();
	xhr.open('GET', url, false);
	xhr.send();
	if(xhr.readyState === xhr.DONE && xhr.status === 200) {
		return xhr.responseText;
	} else {
		return false;
	}
};


class CiteprocWrapper {
	constructor(isLegacy, engine, opts) {
		this.isLegacy = isLegacy;
		this.opts = opts;
		if(isLegacy) {
			this.CSL = engine;
			this.itemsStore = {};
			this.clustersStore = [];
			this.driver = new this.CSL.Engine({
				retrieveLocale: retrieveLocaleSync,
				retrieveItem: itemId => this.itemsStore[itemId],
				uppercase_subtitles: getStyleProperties(opts.style)?.isUppercaseSubtitlesStyle,
			}, opts.style, opts.localeOverride || opts.lang, !!opts.localeOverride);
			this.driver.setOutputFormat(opts.format);
			this.driver.opt.development_extensions.wrap_url_and_doi = opts.formatOptions.linkAnchors;
		} else {
			this.driver = engine;
		}
	}

	batchedUpdates() {
		if(this.isLegacy) {
			const legacyDriverBib = this.driver.makeBibliography();
			var bibliography = null;

			if(legacyDriverBib) {
				const [meta, items] = legacyDriverBib;
				const updatedEntries = meta.entry_ids.reduce((acc, id, index) => {
					acc[id] = items[index];
					return acc;
				}, {});

				bibliography = { entryIds: meta?.entry_ids, updatedEntries };
			}

			const clusters = this.driver.rebuildProcessorState(
				this.clustersStore.map(cluster => ({
					citationID: cluster.id,
					citationItems: fixCitesCompatiblity(cluster.cites)
				}))
			).map(cluster => ([cluster[0], cluster[2]]));

			return { bibliography, clusters };
		} else {
			const updates = this.driver.batchedUpdates();
			// if html output, wrap with csl-entry, until https://github.com/zotero/citeproc-rs/issues/90
			if(this.opts.format === 'html' && updates?.bibliography?.updatedEntries) {
				updates.bibliography.updatedEntries = mapObject(
					updates.bibliography.updatedEntries,
					(k, i) => ([k, `<div class="csl-entry">${i}</div>`])
				)
			}
			return updates;
		}
	}

	bibliographyMeta() {
		if(this.isLegacy) {
			if(!this.nextMeta) {
				throw Error('bibliographyMeta() can only be called immediately after makeBibliography() when using citeprocJS');
			}
			const meta = this.nextMeta;
			delete this.nextMeta;
			return meta;
		} else {
			return this.driver.bibliographyMeta();
		}
	}

	builtCluster(id) {
		if(this.isLegacy) {
			throw new Error('builtCluster() is not supported when using citeprocJS');
		} else {
			return this.driver.builtCluster(id);

		}
	}

	drain() {
		if(this.isLegacy) {
			throw new Error('drain() is not supported when using citeprocJS');
		} else {
			return this.driver.drain();

		}
	}

	fetchLocales() {
		if(this.isLegacy) {
			// CSL fetches locale on its own without being prompted
			return;
		} else {
			return this.driver.fetchLocales();

		}
	}

	free() {
		if(this.isLegacy) {
			// CSL does not require explicit resource freeing
			return;
		} else {
			return this.driver.free();

		}
	}

	fullRender() {
		if(this.isLegacy) {
			const allClusters = this.driver.rebuildProcessorState(
				this.clustersStore.map(cluster => ({
					citationID: cluster.id,
					citationItems: fixCitesCompatiblity(cluster.cites)
				}))
			).reduce((acc, cluster) => {
				acc[cluster[0]] = cluster[2];
				return acc;
			}, {});

			return { allClusters };
		} else {
			return this.driver.fullRender();
		}
	}

	includeUncited(uncited) {
		if(this.isLegacy) {
			this.shouldIncludeUncidted = uncited;
		} else {
			return this.driver.includeUncited(uncited);
		}
	}

	initClusters(clusters) {
		if(this.isLegacy) {
			this.clustersStore = clusters;
		} else {
			return this.driver.initClusters(clusters);
		}
	}

	insertCluster(cluster) {
		if(this.isLegacy) {
			this.clustersStore.push(cluster);
		} else {
			return this.driver.insertCluster(cluster);
		}
	}

	insertReference(refr) {
		if(this.isLegacy) {
			this.itemsStore[refr.id] = refr;
			this.driver.updateItems(Object.keys(this.itemsStore));
		} else {
			return this.driver.insertReference(refr);
		}
	}

	insertReferences(refs) {
		if(this.isLegacy) {
			this.itemsStore = {...this.itemsStore, ...Object.fromEntries(refs.map(item => ([item.id, item]))) };
			this.driver.updateItems(Object.keys(this.itemsStore));
		} else {
			return this.driver.insertReferences(refs);
		}
	}

	makeBibliography() {
		if(this.isLegacy) {
			const [meta, items] = this.driver.makeBibliography();
			this.nextMeta = CiteprocWrapper.metaCiteprocJStoRS(meta, this.opts.format);
			return meta.entry_ids.map((id, index) => ({ id: Array.isArray(id) ? id[0] : id, value: items[index] }));
		} else {
			const bibOutput = this.driver.makeBibliography();
			// if html output, wrap with csl-entry, until https://github.com/zotero/citeproc-rs/issues/90
			return this.opts.format === 'html' ?
				bibOutput.map(i => ({ ...i, value: `<div class="csl-entry">${i.value}</div>` })) :
				bibOutput;
		}
	}

	previewCitationCluster(cites, positions, format) {
		if(this.isLegacy) {
			if(format === 'plain') {
				format = 'text';
			}
			// TODO: pre and post (2nd, 3rd args) from positions?
			return this.driver.previewCitationCluster({ citationItems: fixCitesCompatiblity(cites) }, [], [], format);
		} else {
			return this.driver.previewCitationCluster(cites, positions, format);
		}
	}

	randomClusterId() {
		if(this.isLegacy) {
			throw new Error('randomClusterId() is not supported when using citeprocJS');
		} else {
			return this.driver.randomClusterId();
		}
	}

	removeCluster(cluster_id) {
		if(this.isLegacy) {
			this.clustersStore = this.clustersStore.filter(c => c.id !== cluster_id);
		} else {
			return this.driver.removeCluster(cluster_id);
		}
	}

	removeReference(id) {
		if(this.isLegacy) {
			delete this.itemsStore[id];
			this.driver.updateItems(Object.keys(this.itemsStore));
		} else {
			return this.driver.removeReference(id);
		}
	}

	resetReferences(refs) {
		if(this.isLegacy) {
			this.itemsStore = Object.fromEntries(refs.map(item => ([item.id, item])));
			this.driver.updateItems([]); // workaround for #256
			this.driver.updateItems(Object.keys(this.itemsStore));
		} else {
			return this.driver.resetReferences(refs);

		}
	}

	setClusterOrder(positions) {
		if(this.isLegacy) {
			// TODO: implement for citeproc JS
		} else {
			return this.driver.setClusterOrder(positions);

		}
	}

	setStyle(newStyleXml, newLocaleOverride = null) {
		if(this.isLegacy) {
			// citeprocJS doesn't seem to be able to set style so we recreate the driver
			this.recreateEngine({ style: newStyleXml, localeOverride: newLocaleOverride });
		} else {
			if(newLocaleOverride !== this.opts.localeOverride) {
				// TODO
				throw new Error("CiteprocRS does not support changing locale override.")
			} else {
				return this.driver.setStyle(newStyleXml);
			}
		}
	}

	// not part of citeproc-rs api
	recreateEngine(newOpts) {
		if(this.isLegacy) {
			this.opts = { ...this.opts, ...newOpts };
			this.driver = new this.CSL.Engine({
				retrieveLocale: retrieveLocaleSync,
				retrieveItem: itemId => this.itemsStore[itemId],
				uppercase_subtitles: getStyleProperties(this.opts.style)?.isUppercaseSubtitlesStyle
			}, this.opts.style, this.opts.localeOverride || this.opts.lang, !!this.opts.localeOverride);
			this.driver.setOutputFormat(this.opts.format);
			this.driver.opt.development_extensions.wrap_url_and_doi = this.opts.formatOptions.linkAnchors;
		}
	}
}

const getCSL = async () => {
	if('CSL' in window) {
		return Promise.resolve(window.CSL);
	}

	return new Promise((resolve, reject) => {
		load('/static/js/citeproc.js', (err) => {
			if (err) {
				reject(err);
			} else {
				resolve(window.CSL);
			}
		});
	});
};

const getCiteprocRSLoader = async () => {
	// Loading citeproc-rs involves using dynamic module import (await import(...)) which will
	// trigger a syntax error while the code is being parsed in some older browsers even though zbib
	// would work perfectly fine in such browser with citeprocJS. For this reason we host this code
	// separately and load it here only in a scenario where citeproc-rs is to be used.
	if('getCiteprocRS' in window) {
		return Promise.resolve(window.getCiteprocRS);
	}

	return new Promise((resolve, reject) => {
		load('/static/js/citeproc-rs-loader.js', { type: 'module' }, err => {
			if (err) {
				reject(err);
			} else {
				resolve(window.getCiteprocRS);
			}
		});
	});
}

CiteprocWrapper.new = async ({ style, format = 'html', lang = null, localeOverride = null, formatOptions = { linkAnchors: true } }, useLegacy = null, DriverORCSL = null) => {
	const userLocales = lang ? lang : window ? (window.navigator.languages || window.navigator.userLanguage || window.navigator.language) : null;
	lang = pickBestLocale(userLocales, supportedLocales);
	useLegacy = useLegacy === null ? !isWasmSupported : useLegacy;

	try {
		if(useLegacy) {
			const CSL = DriverORCSL ?? await getCSL();
			if(format === 'plain') {
				format = 'text';
			}
			return new CiteprocWrapper(true, CSL, { style, format, lang, localeOverride, formatOptions });
		} else {
			if(!Driver) {
				if(DriverORCSL) {
					Driver = DriverORCSL;
				} else {
					const citeprocLoader = await getCiteprocRSLoader();
					const { init, CreateDriver } = await citeprocLoader();
					Driver = CreateDriver;
					await init();
				}
			}
			const fetcher = new Fetcher();
			const driver = new Driver({ localeOverride, format, formatOptions, style, fetcher });
			await driver.fetchLocales();
			return new CiteprocWrapper(false, driver, { style, format, lang, localeOverride, formatOptions, Driver });
		}
	} catch(err) {
		console.error(err);
	}
}

CiteprocWrapper.metaCiteprocRStoJS = (bibliographyMeta, format = 'html') => ({
	bibstart: format === 'rtf' ? '{\\rtf ' + bibliographyMeta?.formatMeta?.markupPre : bibliographyMeta?.formatMeta?.markupPre,
	bibend: format === 'rtf' ? bibliographyMeta?.formatMeta?.markupPost + '}' : bibliographyMeta?.formatMeta?.markupPost,
	hangingindent: bibliographyMeta?.hangingIndent,
	maxoffset: bibliographyMeta?.maxOffset,
	entryspacing: bibliographyMeta?.entrySpacing,
	linespacing: bibliographyMeta?.lineSpacing,
	'second-field-align': bibliographyMeta?.secondFieldAlign
});

CiteprocWrapper.metaCiteprocJStoRS = (meta, format = 'html') => ({
	formatMeta: {
		markupPre: format === 'rtf' ? meta.bibstart.slice(6) : meta.bibstart,
		markupPost: format === 'rtf' ? meta.bibend.slice(0, -1) : meta.bibend,
	},
	hangingIndent: meta.hangingindent,
	maxOffset: meta.maxoffset,
	entrySpacing: meta.entryspacing,
	lineSpacing: meta.linespacing,
	secondFieldAlign: meta['second-field-align']
});

export default CiteprocWrapper;
