import assert from 'node:assert/strict';
export function hideTopNavigation(source,{restore=false}={}) {
  const before='_this.set("ready",!0)};let bgShader=';
  const after='_this.ui.group.visible=!1,_this.set("ready",!0)};let bgShader=';
  assert.ok(source.includes(restore?after:before),'NavUI visibility entry changed');
  return source.replace(restore?after:before,restore?before:after);
}
export function hideMusicControls(app,{restore=false}={}) {
  const before='_this.wrapper.div.style.opacity=0,_this.listen("Global/loadFinished"';
  const after='_this.wrapper.div.style.display="none",'+before;
  assert.ok(app.includes(restore?after:before),'MusicPlayerDOM visibility entry changed');
  return app.replace(restore?after:before,restore?before:after);
}
