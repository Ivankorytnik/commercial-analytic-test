(function(){
  const VERSION='2.0.0';
  // Disabled intentionally. requirements-time.js is the single owner of
  // requirement period rendering and editing. Keeping this compatibility
  // stub prevents older cached index.html versions from breaking the table.
  window.ATOM_REQUIREMENTS_PERIOD_DIRECT_TRIGGER={
    version:VERSION,
    disabled:true,
    patch:function(){},
    open:function(){return false;}
  };
})();