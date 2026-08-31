const API_URL = 'https://backboard.railway.com/graphql/v2';

function authHeaders(token, tokenType = 'project') {
  const headers = { 'Content-Type': 'application/json' };
  if (tokenType === 'account') {
    headers.Authorization = `Bearer ${token}`;
  } else {
    headers['Project-Access-Token'] = token;
  }
  return headers;
}

async function gql(token, tokenType, query, variables) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: authHeaders(token, tokenType),
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    throw new Error(`Railway API returned ${res.status}`);
  }
  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((e) => e.message).join('; '));
  }
  return body.data;
}

async function getReplicas(token, tokenType, serviceId, environmentId) {
  const data = await gql(
    token,
    tokenType,
    `query ($serviceId: String!, $environmentId: String!) {
      serviceInstance(serviceId: $serviceId, environmentId: $environmentId) {
        numReplicas
        region
      }
    }`,
    { serviceId, environmentId }
  );
  return {
    numReplicas: data.serviceInstance?.numReplicas ?? 1,
    region: data.serviceInstance?.region ?? null,
  };
}

async function setReplicas(token, tokenType, serviceId, environmentId, numReplicas) {
  await gql(
    token,
    tokenType,
    `mutation ($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
      serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
    }`,
    { serviceId, environmentId, input: { numReplicas } }
  );
}

module.exports = { getReplicas, setReplicas };
