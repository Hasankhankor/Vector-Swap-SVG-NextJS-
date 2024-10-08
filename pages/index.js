import { ReactSVG } from "react-svg";
import { useState, useEffect } from "react";
import { transform, parseAndroidResource } from 'vector-drawable-svg';
import SVG from 'react-inlinesvg';
import { useFilePicker } from 'react-sage';
import Head from "next/head";
import GitHubButton from 'react-github-btn'
import CodeMirror from '@uiw/react-codemirror';
import { xml } from '@codemirror/lang-xml';
import { vscodeDark, vscodeDarkInit } from '@uiw/codemirror-theme-vscode';

const STATE_NONE = -1
const STATE_DRAG_LEAVE = 0
const STATE_DRAGGING = 1
const STATE_DROP = 2

function createOverridePlaceholder(value) {
	const regex = /\@(\w+)\/(\w+)/gm
	let result = null
	const items = []

	const defaults = {
		color: "#FF00FF",
		dimen: "0dp",
		string: "None"
	}

	while (result = regex.exec(value)) {
		items.push([result[1], result[2]])
	}

	if (items.length === 0) {
		return ''
	}

	const innerElement = items.map(([tag, name]) => `  <${tag} name=${JSON.stringify(name)}>${defaults[tag] || '""'}</${tag}>`).join("\n")
	return `
	<!--missing values-->
	<resources>
${innerElement}
	</resources>`.replace(/^\s/gm, '')
}

function downloadBlob(filename, text) {
	const element = document.createElement('a');
	element.setAttribute('href', 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);
	element.style.display = 'none';
	document.body.appendChild(element);
	element.click();
	document.body.removeChild(element);
}

function isValidFileType(type) {
	if (type === 'text/xml') return true;
	return type === 'application/xml';
}

function transformXmlOrNull(value, options) {
	if (!value) {
		return null;
	}
	try {
		return transform(value, options)
	} catch (e) {
		console.warn(e)
	}
}

function dropzoneClassOfState(state) {
	if (state === STATE_DRAG_LEAVE) return '';
	if (state === STATE_DRAGGING) return 'vd-highlight';
	if (state === STATE_DROP) return 'vd-active';
}

async function readFileContent(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result)
		reader.readAsText(file);
	});
}

export default function Home() {

	const { files, onClick: onDropzoneClick, errors, HiddenFileInput } = useFilePicker({
		maxFileSize: 1,
	})

	const [dragState, setDragState] = useState(STATE_NONE)
	const [isEnabled, setEnabled] = useState(false);
	const [vectorDrawableFile, setVectorDrawableFile] = useState()
	const [transformedSvg, setTransformedSvg] = useState()
	const [xmlResource, setXmlResource] = useState("<!--Android XML resources-->")

	const override = (() => {
		try {
			const result = parseAndroidResource(xmlResource)
			if (result) return result
		} catch (ignored) {
		}
		return {}
	})()

	useEffect(() => {

		(async () => {
			const file = vectorDrawableFile
			if (!file) return

			const xmlContent = await readFileContent(file);
			const svgContent = transformXmlOrNull(xmlContent, { override });

			if (!svgContent) {
				return;
			}

			setTransformedSvg(svgContent);
		})()

	}, [override, vectorDrawableFile])

	function dragEnter(e) {
		e.stopPropagation();
		e.preventDefault();
		setDragState(STATE_DRAGGING)
	}

	function dragLeave(e) {
		e.stopPropagation();
		e.preventDefault();
		setDragState(STATE_DRAG_LEAVE)
	}

	async function proceedFile(file) {
		const xmlContent = await readFileContent(file);
		const svgContent = transformXmlOrNull(xmlContent, { override });

		if (Object.entries(override).length === 0) {
			const placeholder = createOverridePlaceholder(xmlContent)
			if (placeholder) {
				setXmlResource(placeholder)

			}
		}


		if (!svgContent) {
			return;
		}

		setTransformedSvg(svgContent);
		setVectorDrawableFile(file);
		setDragState(STATE_DROP);
	}

	async function fileDrop(e) {
		e.preventDefault();
		e.stopPropagation();
		const files = e.dataTransfer.files;

		if (files.length > 0) {
			const file = files[0]
			if (isValidFileType(file.type)) {
				await proceedFile(file);
				return;
			}
		}

		setDragState(STATE_NONE);
	}

	function dragOver(e) {
		e.preventDefault();
		e.stopPropagation();
		e.dataTransfer.dropEffect = 'copy';
	}

	function clearUpload(e) {
		e.stopPropagation();
		setDragState(STATE_NONE)
		setVectorDrawableFile(null);
		setTransformedSvg(null);
	}

	function downloadCurrentSvg() {

		if (!transformedSvg) {
			return;
		}

		let filename = 'output.svg';
		if (vectorDrawableFile) {
			filename = vectorDrawableFile.name.split('.').slice(0, -1).join('.') + ".svg";
		}

		downloadBlob(filename, transformedSvg);
	}

	useEffect(() => {
		const getDataUrls = async () => {
			if (files.length <= 0) {
				return;
			}
			const file = files[0];
			if (isValidFileType(file.type)) {
				await proceedFile(file);
			}
		}
		getDataUrls()
	}, [files])

	return (
		<>
			<Head>
				<title>VectorSwap to SVG</title>
			</Head>
			<div className="vd-form-center">
				<HiddenFileInput accept=".xml" multiple={false} />
				<div className="vd-head vd-form-center">
					<h1 className="vd-title">VectorDrawable to SVG</h1>
					<p className="vd-subtitle">Drop a valid vector drawable file here.</p>
					<GitHubButton href="https://github.com/Hasankhankor/Vector-Swap-SVG-NextJS-"
						data-color-scheme="no-preference: light; light: dark; dark: dark;"
						data-icon="octicon-star"
						data-size="large"
						data-show-count="true"
						aria-label="Star seanghay/vector-drawable-nextjs on GitHub"
					>Star</GitHubButton>
					<p className="vd-subtitle"><small>Help us get to many stars on GitHub</small></p>
					<div
						onDragEnter={dragEnter}
						onDragLeave={dragLeave}
						onDragOver={dragOver}
						onDrop={fileDrop}
						onClick={onDropzoneClick}

						className={"vd-dropzone " + dropzoneClassOfState(dragState)}>
						<div className="vd-placeholder">
							<ReactSVG src="plus.svg" />
						</div>
						<div className="vd-image-container">
							<div onClick={clearUpload} className="text-button-icon">
								<ReactSVG src="close.svg" />
							</div>
							<div className="vd-image">
								<SVG src={transformedSvg} width={300} height={300} title="SVG" />
							</div>

							<div className="vd-filename">
								<p>{vectorDrawableFile?.name}</p>
							</div>
						</div>
					</div>

					<button onClick={downloadCurrentSvg} disabled={!vectorDrawableFile} className="vd-download">
						<ReactSVG src="/download-circular-button.svg" />
						Download
					</button>

					<div style={{
						marginTop: '1rem',
						border: '1px solid rgba(255,255,255,0.1)',
						borderRadius: '.4rem',
						padding: '4px',
						background: "#1f1f1f"
					}}>
						<CodeMirror
							value={xmlResource}
							onChange={setXmlResource}
							style={{ fontSize: "14px" }}
							extensions={xml()}
							width="400px"
							theme={vscodeDark}
						></CodeMirror>
					</div>

					<p style={{ maxWidth: 400, textAlign: "center" }}>
						<small>This allows you to convert Vector Drawable that uses color resources like <code style={{ color: 'white' }}>@color/colorAccent</code></small>
					</p>

					<footer className="vd-footer">
						<div className="vd-github">
							<h4>Hasankhankor</h4>
							<a href="https://github.com/Hasankhankor" target="_blank">
								<ReactSVG src="/github.svg" />
							</a>
						</div>

						<h5>Or using command line</h5>

						<p className="vd-code-snippet">
							npx <span className="vd-cmd">vector-drawable-svg</span> <span className="vd-input">my-drawable.xml</span> <span className="vd-input">out.svg</span>
						</p>

					</footer>
				</div>
			</div>
		</>
	)
}
