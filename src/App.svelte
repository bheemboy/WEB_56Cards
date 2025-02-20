<script lang="ts">
  import { Router, Link, Route } from "svelte-routing";
  import Home from "./routes/Home.svelte";
  import Table from "./routes/Table.svelte";

  export let url = "";
</script>


<Router {url}>
  <div>
    <Route path="/table"><Table /></Route>
    <Route path="/"><Home /></Route>
  </div>
</Router>





