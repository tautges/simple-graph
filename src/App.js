import React, { Component } from 'react';
import './App.css';

const WIDTH = 940;
const HEIGHT = 525;
const CUSHION = 60;
const MARKER_LENGTH = 10;
const MARKER_TEXT_HEIGHT = 6;

const X_NAME_INDEX = 0;
const X_UNITS_INDEX = 1;
const Y_NAME_INDEX = 2;
const Y_UNITS_INDEX = 3;

const makePoint = (x, y) => { return { x: x, y: y }; };

const genericPoints = [
    makePoint(null, null),
    makePoint(null, null),
    makePoint(null, null),
    makePoint(null, null),
    makePoint(null, null)
];

class Checkbox extends Component {
    constructor(props) {
        super(props);

        this.isChecked = props.isChecked;
        this.onChange = props.onChange;
    }

    render() {
        return (
            <input
                type="checkbox"
                checked={this.isChecked()}
                onChange={this.onChange} 
            />
        );
    }
}

class App extends Component {
    constructor() {
        super();

        this.anchorOrigin = true;
        this.showBestFitLine = false;
        this.showConnectingLines = false;
        this.showCoordinates = false;
        this.showRSquaredValue = false;
        this.showIntegration = false;

        this.canvas = null;

        this.drawCanvas = this.drawCanvas.bind(this);
        this.graphData = [ '', '', '', '' ];
        this.points = genericPoints;
    }

    minMaxValues(myPoints) {
        const xVals = myPoints.map(point => point.x);
        const yVals = myPoints.map(point => point.y);

        xVals.sort((a, b) => a - b);
        yVals.sort((a, b) => a - b);

        // [ minX, maxX, minY, maxY ]
        return [ xVals[0], xVals[xVals.length - 1], yVals[0], yVals[yVals.length - 1] ];
    }

    calculateBestFitLine(myPoints) {
        let sumX = 0;
        let sumY = 0;

        for (var i = 0; i < myPoints.length; i++) {
            sumX += myPoints[i].x;
            sumY += myPoints[i].y;
        }

        const xHat = sumX / myPoints.length;
        const yHat = sumY / myPoints.length;

        let mNumerator = 0;
        let mDenominator = 0;

        for (var i = 0; i < myPoints.length; i++) {
            let xMinusXHat = myPoints[i].x - xHat;
            mNumerator += xMinusXHat * (myPoints[i].y - yHat);
            mDenominator += xMinusXHat * xMinusXHat;
        }

        const slope = mNumerator / mDenominator;
        const yIntercept = yHat - slope * xHat;

        return {
            slope: slope,
            yIntercept: yIntercept
        };
    }

    calculateCorrelationCoefficient(myPoints) {
        let sumX = 0;
        let sumXSquared = 0;
        let sumY = 0;
        let sumYSquared = 0;
        let sumXY = 0;

        for (var i = 0; i < myPoints.length; i++) {
            sumX += myPoints[i].x;
            sumXSquared += myPoints[i].x * myPoints[i].x;
            sumY += myPoints[i].y;
            sumYSquared += myPoints[i].y * myPoints[i].y;
            sumXY += myPoints[i].x * myPoints[i].y;
        }

        const numerator = myPoints.length * sumXY - sumX * sumY;
        const denominatorXSide = myPoints.length * sumXSquared - sumX * sumX;
        const denominatorYSide = myPoints.length * sumYSquared - sumY * sumY;
        const denominator = Math.sqrt(denominatorXSide * denominatorYSide);

        const r = numerator / denominator;
        return r * r;
    }

    integrate(myPoints) {
        let integration = 0;

        for (var i = 0; i < myPoints.length - 1; i++) {
            const firstPoint = myPoints[i];
            const secondPoint = myPoints[i + 1];

            if (firstPoint.y >= 0 && secondPoint.y >= 0) {
                // add the rectangle
                integration += Math.min(firstPoint.y, secondPoint.y) * (secondPoint.x - firstPoint.x);
                // add the triangle
                integration += (Math.max(firstPoint.y, secondPoint.y) - Math.min(firstPoint.y, secondPoint.y)) * (secondPoint.x - firstPoint.x) / 2;
            } else if (firstPoint.y <= 0 && secondPoint.y <= 0) {
                // add the rectangle
                integration += Math.max(firstPoint.y, secondPoint.y) * (secondPoint.x - firstPoint.x);
                // add the triangle
                integration += (Math.min(firstPoint.y, secondPoint.y) - Math.max(firstPoint.y, secondPoint.y)) * (secondPoint.x - firstPoint.x) / 2;
            } else if (firstPoint.y < secondPoint.y) {
                // => firstPoint.y < 0
                const xBelow = Math.abs(firstPoint.y) / (secondPoint.y - firstPoint.y) * (secondPoint.x - firstPoint.x);
                integration += xBelow * firstPoint.y / 2;
                const xAbove = secondPoint.y / (secondPoint.y - firstPoint.y) * (secondPoint.x - firstPoint.x);
                integration += xAbove * secondPoint.y / 2;
            } else {
                // => firstPoint.y > 0
                const xAbove = firstPoint.y / (secondPoint.y - firstPoint.y) * (secondPoint.x - firstPoint.x);
                integration += xAbove * firstPoint.y / 2;
                const xBelow = Math.abs(secondPoint.y) / (secondPoint.y - firstPoint.y) * (secondPoint.x - firstPoint.x);
                integration += xBelow * secondPoint.y / 2;
            }
        }

        return integration;
    }

    filterInvalidPoints(points) {
        return points.filter(p => p.x != null && p.y != null).map(p => ({ x: parseFloat(p.x), y: parseFloat(p.y) })).filter(p => !isNaN(p.x) && !isNaN(p.y));
    }

    componentDidMount() {
        this.canvas = this.refs.canvas;

        this.drawCanvas();
    }

    drawCanvas() {
        if (this.canvas == null) {
            return {
                bestFitLine: null,
                correlationCoefficient: null,
                integration: null
            };
        }

        const ctx = this.canvas.getContext("2d");
        ctx.beginPath();
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.stroke();
        
        // Note that we give a cushion of CUSHION pixels on all sides
        const points = this.filterInvalidPoints(this.points.slice());
        points.sort((a, b) => a.x - b.x);

        const minMaxVals = this.minMaxValues(points);
        const minX = this.anchorOrigin ? 1 : minMaxVals[0];
        const maxX = minMaxVals[1];
        const minY = Math.floor(this.anchorOrigin ? 1 : minMaxVals[2]);
        const maxY = Math.ceil(minMaxVals[3]);

        const xRange = (maxX - minX) || 0;
        const yRange = (maxY - minY) || 0;

        // we want to draw an extra mark on either side
        const pixelsPerX = (WIDTH - 2 * CUSHION) / (xRange + 2) || (WIDTH - 2 * CUSHION / 2);
        const pixelsPerY = (HEIGHT - 2 * CUSHION) / (yRange + 2) || (HEIGHT - 2 * CUSHION / 2);

        /* draw the x-axis */
        const xAxisHeight = /* maxY < 0 => we draw it at the top */ maxY && maxY < 0 ? 0 :
            (/* minY > 0 => we draw it at the bottom */ minY && minY > 0 ? ((yRange + 2) * pixelsPerY) : 
            // Otherwise we calculate. (0 - minY) tells us the tick on which to draw the line. +1 accounts for the extra mark on either side.
            // And (yRange - [that result]) takes care of inverting the y-axis.
            ((yRange - (0 - minY) + 1) * pixelsPerY));
        ctx.moveTo(CUSHION, CUSHION + xAxisHeight);
        ctx.lineTo(WIDTH - CUSHION, CUSHION + xAxisHeight);
        ctx.stroke();
        // draw the x-axis markers
        for (var i = 0; i <= xRange + 2; i++) {
            ctx.moveTo(CUSHION + pixelsPerX * i, CUSHION + xAxisHeight - MARKER_LENGTH / 2);
            ctx.lineTo(CUSHION + pixelsPerX * i, CUSHION + xAxisHeight + MARKER_LENGTH / 2);
            ctx.stroke();

            const markerLabel = "" + ((minX || 1) - 1 + i);
            ctx.fillText(markerLabel, CUSHION + pixelsPerX * i - ctx.measureText(markerLabel).width / 2, CUSHION + xAxisHeight + CUSHION * 1 / 4);
        }

        /* draw the y-axis */
        const yAxisWidth = /* maxX < 0 => we draw it at the right */ maxX && maxX < 0 ? ((xRange + 2) * pixelsPerX) :
            (/* minX > 0 => we draw it at the left */ minX && minX > 0 ? 0 : 
            // Otherwise we calculate. (0 - minX) tells us the tick on which to draw the line. +1 accounts for the extra mark on either side.
            (((0 - minX) + 1) * pixelsPerX));
        ctx.moveTo(CUSHION + yAxisWidth, CUSHION);
        ctx.lineTo(CUSHION + yAxisWidth, HEIGHT - CUSHION);
        ctx.stroke();
        // draw the y-axis markers
        for (var i = 0; i <= yRange + 2; i++) {
            ctx.moveTo(CUSHION + yAxisWidth - MARKER_LENGTH / 2, CUSHION + pixelsPerY * i);
            ctx.lineTo(CUSHION + yAxisWidth + MARKER_LENGTH / 2, CUSHION + pixelsPerY * i);
            ctx.stroke();

            const markerLabel = "" + ((maxY || 1) + 1 - i);
            ctx.fillText(markerLabel, CUSHION * 3 / 4 + yAxisWidth - MARKER_LENGTH / 2, CUSHION + pixelsPerY * i + MARKER_TEXT_HEIGHT / 2);
        }

        ctx.font = "14px Georgia";

        /* draw y-axis label */
        const yAxisLabel = this.graphData[2] + " (" + this.graphData[3] + ")";
        // save our context for post-rotation restoration
        ctx.save();
        ctx.rotate(3 * Math.PI / 2);
        ctx.fillText(yAxisLabel, -HEIGHT / 2 - ctx.measureText(yAxisLabel).width / 2, CUSHION / 2);
        // restore the original context
        ctx.restore();

        /* draw x-axis label */
        const xAxisLabel = this.graphData[0] + " (" + this.graphData[1] + ")";
        ctx.fillText(xAxisLabel, WIDTH / 2 - ctx.measureText(xAxisLabel).width / 2, HEIGHT - CUSHION / 2);

        const virtualizePoint = (point) => {
            // +1 because we drew an extra mark above and below our range
            const virtualX = (point.x - minX + 1) * pixelsPerX + CUSHION;
            const virtualY = (point.y - minY + 1) * pixelsPerY + CUSHION;

            return {
                x: virtualX,
                y: HEIGHT - virtualY
            };
        };

        let previousPoint = null;
        // draw each point, virtualizing their points onto the graph
        for (var i = 0; i < points.length; i++) {
            const point = points[i];

            const virtualPoint = virtualizePoint(point);

            ctx.beginPath();
            // Remember that Y goes from 0 at top to MAX at bottom on canvas... we have to subtract the virtualY from HEIGHT
            ctx.arc(virtualPoint.x, virtualPoint.y, 3, 0, 2 * Math.PI, true);
            ctx.fill();
            ctx.stroke();

            if (this.showConnectingLines && previousPoint != null) {
                ctx.moveTo(previousPoint.x, previousPoint.y);
                ctx.lineTo(virtualPoint.x, virtualPoint.y);
                ctx.stroke();
            }

            if (this.showCoordinates) {
                const coordinateString = "(" + point.x + ", " + point.y + ")";
                ctx.fillText(coordinateString, virtualPoint.x + 5, virtualPoint.y + 5);
            }

            previousPoint = virtualPoint;
        }

        let bestFitLine = null;
        if (this.showBestFitLine) {
            bestFitLine = this.calculateBestFitLine(points);

            const lowY = bestFitLine.slope * (minX - 1) + bestFitLine.yIntercept;
            const highY = bestFitLine.slope * (maxX + 1) + bestFitLine.yIntercept;

            const lowPoint = virtualizePoint({ x: minX - 1, y: lowY });
            const highPoint = virtualizePoint({ x: maxX + 1, y: highY });

            ctx.moveTo(lowPoint.x, lowPoint.y);
            ctx.lineTo(highPoint.x, highPoint.y);
            ctx.stroke();
        }

        const correlationCoefficient = this.calculateCorrelationCoefficient(points);
        const integration = this.integrate(points);

        return { bestFitLine: bestFitLine, correlationCoefficient: correlationCoefficient, integration: integration };
    }

    render() {
        const getAnchorOrigin = (() => this.anchorOrigin).bind(this);
        const flopAnchorOrigin = (() => {
            this.anchorOrigin = !this.anchorOrigin;
            this.forceUpdate();
        }).bind(this);

        const getShowConnectingLine = (() => this.showConnectingLines).bind(this);
        const flopConnectingLine = (() => {
            this.showConnectingLines = !this.showConnectingLines;
            this.forceUpdate();
        }).bind(this);

        const getShowBestFitLine = (() => this.showBestFitLine).bind(this);
        const flopShowBestFitLine = (() => {
            this.showBestFitLine = !this.showBestFitLine;
            this.forceUpdate();
        }).bind(this);

        const getShowCoordinates = (() => this.showCoordinates).bind(this);
        const flopShowCoordinates = (() => {
            this.showCoordinates = !this.showCoordinates;
            this.forceUpdate();
        }).bind(this);

        const getShowRSquaredValue = (() => this.showRSquaredValue).bind(this);
        const flopShowRSquaredValue = (() => {
            this.showRSquaredValue = !this.showRSquaredValue;
            this.forceUpdate();
        }).bind(this);

        const getShowIntegration = (() => this.showIntegration).bind(this);
        const flopShowIntegration = (() => {
            this.showIntegration = !this.showIntegration;
            this.forceUpdate();
        }).bind(this);

        const stats = this.drawCanvas();

        const bestFitDiv = stats.bestFitLine == null ? null : (
            <div className="indi-stat-div">
                <strong>Best-Fit Line Equation:<br /></strong> y = {stats.bestFitLine.slope.toFixed(3)}x + {stats.bestFitLine.yIntercept.toFixed(3)}
            </div>
        );

        const setGraphData = ((index, value) => {
            this.graphData[index] = value;
            this.forceUpdate();
        }).bind(this);
        const getGraphData = ((index) => this.graphData[index]).bind(this);

        const valueOrBlank = (value) => value !== '-' && value !== '.' && value !== '0.' && isNaN(value) ? '' : value;

        let index = -1; // track where we are in the points list
        const pointRows = this.points.map(point => {
            index++;
            const removePointFn = (myIndex) => {
                return () => {
                    this.points.splice(myIndex, 1);
                    this.forceUpdate();
                };
            };

            return (
                <tr>
                    <td><input className="point-input" type="text" value={valueOrBlank(point.x)} onChange={((event) => { point.x = event.target.value; this.forceUpdate() }).bind(this)} /></td>
                    <td><input className="point-input" type="text" value={valueOrBlank(point.y)} onChange={((event) => { point.y = event.target.value; this.forceUpdate() }).bind(this)} /></td>
                    <td><button className="remove-btn" onClick={removePointFn(index)}>x</button></td>
                </tr>
            );
        });

        const addPointFn = (() => { this.points.push({ x: null, y: null }); this.forceUpdate(); }).bind(this);

        const xValuesLabel = getGraphData(X_NAME_INDEX) ? getGraphData(X_NAME_INDEX) : 'X';
        const yValuesLabel = getGraphData(Y_NAME_INDEX) ? getGraphData(Y_NAME_INDEX) : 'Y';

        const unitsRow = getGraphData(X_UNITS_INDEX) || getGraphData(Y_UNITS_INDEX) ? (
            <tr>
                <td><div className="points-box-td"><center><strong>{getGraphData(X_UNITS_INDEX) ? `(${getGraphData(X_UNITS_INDEX)})` : ''}</strong></center></div></td>
                <td><div className="points-box-td"><center><strong>{getGraphData(Y_UNITS_INDEX) ? `(${getGraphData(Y_UNITS_INDEX)})` : ''}</strong></center></div></td>
            </tr>
        ) : null;

        const graphTitle = `${getGraphData(Y_NAME_INDEX) || 'Y-Axis'} vs. ${getGraphData(X_NAME_INDEX) || 'X-Axis'}`; 

        const downloadCsv = () => {
            const data = this.filterInvalidPoints(this.points.slice());
    
            let csv = 'X,Y\n';
            data.forEach(p => {
                csv += p.x + "," + p.y;
                csv += "\n";
            });
         
            // hacking a download
            const hiddenElement = document.createElement('a');
            hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csv);
            hiddenElement.target = '_blank';
            hiddenElement.download = graphTitle.replace(/vs\./, 'Vs.').replace(/ /g, '').replace(/\./, '') + '.csv';
            hiddenElement.click();
        }

        return (
            <div
                className="app-div"
            >
                <div
                    className="side-by-side-box"
                >
                    <div
                        className="sidebar-checkboxes"
                    >
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        <Checkbox 
                                            isChecked={getAnchorOrigin}
                                            onChange={() => { flopAnchorOrigin(); this.forceUpdate(); }}
                                        />
                                    </td>
                                    <td>
                                        Anchor Origin
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Checkbox 
                                            isChecked={getShowConnectingLine}
                                            onChange={() => { flopConnectingLine(); this.forceUpdate(); }}
                                        />
                                    </td>
                                    <td>
                                        Show Connecting Lines
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Checkbox 
                                            isChecked={getShowBestFitLine}
                                            onChange={() => { flopShowBestFitLine(); this.forceUpdate(); }}
                                        />
                                    </td>
                                    <td>
                                        Show Best-Fit Line
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Checkbox 
                                            isChecked={getShowCoordinates}
                                            onChange={() => { flopShowCoordinates(); this.forceUpdate(); }}
                                        />
                                    </td>
                                    <td>
                                        Show Coordinates
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Checkbox 
                                            isChecked={getShowRSquaredValue}
                                            onChange={() => { flopShowRSquaredValue(); this.forceUpdate(); }}
                                        />
                                    </td>
                                    <td>
                                        R^2{getShowRSquaredValue() && stats && stats.correlationCoefficient && ':'} {getShowRSquaredValue() && stats && stats.correlationCoefficient}
                                    </td>
                                </tr>
                                <tr>
                                    <td>
                                        <Checkbox 
                                            isChecked={getShowIntegration}
                                            onChange={() => { flopShowIntegration(); this.forceUpdate(); }}
                                        />
                                    </td>
                                    <td>
                                        Area Under the Curve{getShowIntegration() && stats && stats.integration && ':'} {getShowIntegration() && stats && stats.integration}
                                    </td>
                                </tr>
                                <tr>
                                    <td></td>
                                    <td>
                                        {bestFitDiv}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <br />
                        <table>
                            <tbody>
                                <tr>
                                    <td><strong>X-Axis Name:</strong></td>
                                    <td><input type="text" value={getGraphData(X_NAME_INDEX)} onChange={(event) => setGraphData(X_NAME_INDEX, event.target.value)} /></td>
                                </tr>
                                <tr>
                                    <td><strong>X-Axis Units:</strong></td>
                                    <td><input type="text" value={getGraphData(X_UNITS_INDEX)} onChange={(event) => setGraphData(X_UNITS_INDEX, event.target.value)} /></td>
                                </tr>
                                <tr>
                                    <td><strong>Y-Axis Name:</strong></td>
                                    <td><input type="text" value={getGraphData(Y_NAME_INDEX)} onChange={(event) => setGraphData(Y_NAME_INDEX, event.target.value)} /></td>
                                </tr>
                                <tr>
                                    <td><strong>Y-Axis Units:</strong></td>
                                    <td><input type="text" value={getGraphData(Y_UNITS_INDEX)} onChange={(event) => setGraphData(Y_UNITS_INDEX, event.target.value)} /></td>
                                </tr>
                            </tbody>
                        </table>
                        <div
                            className="points-box"
                        >
                            <table>
                                <tbody>
                                    <tr>
                                        <td><div className="points-box-td"><center><strong>{xValuesLabel}</strong></center></div></td>
                                        <td><div className="points-box-td"><center><strong>{yValuesLabel}</strong></center></div></td>
                                    </tr>
                                    {unitsRow}
                                    {pointRows}
                                    <button className="add-points-btn" onClick={addPointFn}>Add Point</button>
                                </tbody>
                            </table>
                        </div>
                        <div className="export-btn-div">
                            <button onClick={downloadCsv}>Export Points as CSV</button> 
                        </div>
                    </div>
                    <div
                        className="canvasDiv"
                    >
                        <center><h1>{graphTitle}</h1></center>
                        <canvas ref="canvas" className="canvas" width={WIDTH} height={HEIGHT} />
                    </div>
                </div>
            </div>
        );
    }
}

export default App;
