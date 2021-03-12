import React from 'react';
import PropTypes from 'prop-types';
import { default as KeyHandler } from 'react-key-handler';
import { KEYDOWN } from 'react-key-handler';
import Button from './ui/button';
import Modal from './modal';

class Confirmation extends React.Component {
	render() {
		return (
			<Modal
				key="react-modal"
				className="modal modal-centered"
				isOpen={ this.props.isOpen }
				contentLabel={ this.props.title }
				onRequestClose={ () => this.props.onCancel() }
			>
				<React.Fragment>
					<KeyHandler
						keyEventName={ KEYDOWN }
						keyValue="Escape"
						onKeyHandle={ () => this.props.onCancel() }
					/>
					<KeyHandler
						keyEventName={ KEYDOWN }
						keyValue="Enter"
						onKeyHandle={ () => this.props.onConfirm() }
					/>
					<div className="modal-content" tabIndex={ -1 }>
						<div className="modal-header">
							<h4 className="modal-title text-truncate">
								{ this.props.title }
							</h4>
						</div>
						<div className="modal-body">
							{ this.props.children }
						</div>
						<div className="modal-footer">
							<div className="buttons">
								<Button
									className="btn-outline-secondary"
									onClick={ () => this.props.onCancel() }>
									{ this.props.cancelLabel }
								</Button>
								<Button
									className="btn-secondary"
									onClick={ () => this.props.onConfirm() }>
									{ this.props.confirmLabel }
								</Button>
							</div>
						</div>
					</div>
				</React.Fragment>
			</Modal>
		);
	}

	static propTypes = {
		cancelLabel: PropTypes.string,
		confirmLabel: PropTypes.string,
		isOpen: PropTypes.bool,
		children: PropTypes.oneOfType([
			PropTypes.arrayOf(PropTypes.node),
			PropTypes.node
		]),
		onCancel: PropTypes.func.isRequired,
		onConfirm: PropTypes.func.isRequired,
		title: PropTypes.string,
	}

	static defaultProps = {
		cancelLabel: 'Cancel',
		confirmLabel: 'Confirm',
		title: 'Confirmation',
	};
}


export default Confirmation;
