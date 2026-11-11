import { MAX_ZOOM, MIN_ZOOM, type ZoomControl } from '../board/zoom';
import { el } from '../dom';

const STEP = 0.5;

/** − / level / + buttons for a zoom control. The level button fits the board again. */
export function createZoomBar(zoom: ZoomControl): HTMLElement {
  const zoomOut = el('button', { textContent: '−', ariaLabel: 'Zoom out', title: 'Zoom out' });
  const level = el('button', { className: 'zoom-level', title: 'Fit to screen' });
  const zoomIn = el('button', { textContent: '+', ariaLabel: 'Zoom in', title: 'Zoom in' });
  zoomOut.onclick = () => zoom.setZoom(zoom.zoom - STEP);
  zoomIn.onclick = () => zoom.setZoom(zoom.zoom + STEP);
  level.onclick = () => zoom.setZoom(MIN_ZOOM);

  const render = (z: number) => {
    const percent = `${Math.round(z * 100)}%`;
    level.textContent = percent;
    level.ariaLabel = `Zoom ${percent}, fit to screen`;
    zoomOut.disabled = z <= MIN_ZOOM;
    zoomIn.disabled = z >= MAX_ZOOM;
  };
  zoom.onChange(render);
  render(zoom.zoom);

  return el('div', { className: 'zoom-bar segmented', role: 'group', ariaLabel: 'Zoom' }, [
    zoomOut,
    level,
    zoomIn,
  ]);
}
