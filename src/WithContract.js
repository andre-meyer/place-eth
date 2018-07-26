import React, { Component } from 'react'
import { getContract, setupContract, getAccounts } from 'api'

/**
 * Higher-Order Component to add Contract Information to a Component. This Component will add the following props:
 * 
 * contracts: Classes of Contracts (Constructor)
 * instances: Instances that were loaded, always the deployed version, additional instances can be loaded at runtime
 * deployed: Instances of contracts that were deployed to the current network
 * 
 * @param {array|string} contractNameOrNames 
 * @param {object} options 
 */
const WithContract = (contractNameOrNames, options = {onError: console.error}) => (ChildComponent) => {
  return class extends Component {
    constructor(props) {
      super(props)

      this.contracts = {}
      this.instances = {}
      this.deployed = {}

      this.refresh = this.refresh.bind(this)
      this.handleSelectAccount = this.handleSelectAccount.bind(this)
      this.handleShowAccounts = this.handleShowAccounts.bind(this)

      this.state = {
        hasLoaded: false,
        hasErrored: false,
        account: undefined,
        showAccounts: false,
      }
    }

    handleSelectAccount(e) {
      e.preventDefault()
      const account = e.target.innerText

      this.setState({ account })
    }

    handleShowAccounts(e) {
      e.preventDefault()

      this.setState({ showAccounts: !this.state.showAccounts })
    }

    /**
     * Loads a Truffle Contract Class
     * 
     * @param {*} contractName 
     */
    async loadContract(contractName) {
      try {
        if (!this.contracts[contractName]) {
          this.contracts[contractName] = await getContract(contractName)
          const deployedInstance = await this.contracts[contractName].deployed()
          console.log(`Loaded deployed contract ${contractName}`, deployedInstance)
          if (!this.instances[contractName]) {
            this.instances[contractName] = {}
          }
  
          if (!this.deployed[contractName]) {
            this.deployed[contractName] = {}
          }
  
          this.deployed[contractName] = deployedInstance
          this.instances[contractName][deployedInstance.address] = deployedInstance
        }
      } catch (e) {
        console.error(e)
        console.warn(`Could not load Contract: ${contractName}`)
        if (typeof options.onError === 'function') {
          options.onError(e, this.props)
        }
        throw e
      }
    }

    /**
     * Load the instance of a Truffle Contract at a certain address
     * 
     * @param {*} contractName 
     * @param {*} address 
     */
    async loadInstance(contractName, address) {
      try {
        if(!this.contracts[contractName] || !this.instances[contractName][address]) {
          console.log(`Loading Contract Instance: ${contractName}@${address}`)
          await this.loadContract(contractName)
          // need to wrap the .at function because it's not a simple promise
          const contract = await (new Promise((resolve, reject) => {
            this.contracts[contractName].at(address).then((inst) => {
              resolve(inst)
            }, reject).catch((err) => {
              reject(err)
            })
          }))
  
          this.instances[contractName][address] = contract  
        }

        return this.instances[contractName][address] 
      } catch (e) {
        console.warn(`Could not load Contract Instance: ${contractName}@${address}`)
        if (typeof options.onError === 'function') {
          options.onError(e, this.props)
        }
        throw e
      }
    }

    /**
     * Load the deployed instance of a Truffle Contract
     * 
     * @param {*} contractName 
     */
    async loadDeployed(contractName) {
      try {
        if (!this.deployed[contractName]) {
          console.log(`Loading deployed Contract: ${contractName}`)
          const contract = await this.contracts[contractName].deployed()
  
          this.deployed[contractName] = contract
          this.instances[contract.address] = contract
        }
        return this.deployed[contractName][address]
      } catch (e) {
        console.warn(`Could not load deployed Contract: ${contractName}`)
        if (typeof options.onError === 'function') {
          options.onError(e, this.props)
        }
        throw e
      }
    }

    async fetchContractsFromProps() {
      this.accounts = await getAccounts()
      console.log(this.accounts)

      // load contracts from contractNamesOrNames (array or string)
      if (typeof contractNameOrNames === 'object') {
        this.contracts = {}
        this.instances = {}
        const promises = contractNameOrNames.map(async (contractName) => await this.loadContract(contractName))

        await Promise.all(promises)
        console.log({promises})

      } else {
        this.contracts = {}
        this.instances = {}
        await this.loadContract(contractNameOrNames)
      }

      if (!this.state.account) {
        this.setState({ account: this.accounts[0] })
      }

      // load additional instances of contracts from prop function
      if (typeof options.loadInstances === 'function') {
        const contractNamesAndAddreses = options.loadInstances(this.props)
        let loadInstancePromises = []

        Object.keys(contractNamesAndAddreses).forEach((contractName) => {
          const promises = contractNamesAndAddreses[contractName].map(async (address) => {
            await this.loadInstance(contractName, address)
          })

          loadInstancePromises = [...loadInstancePromises, ...promises]
        })
        await Promise.all(loadInstancePromises)
      }
    }

    async mapContractInstancesToProps() {
      // map contract instances to props
      if (typeof options.mapContractInstancesToProps === 'function') {
        let instanceMappingProps = {}
        const passedProps = {
          contracts: this.contracts,
          instances: this.instances,
        }

        let mappingPromises = []
        Object.keys(this.instances).forEach((contractName) => {
          const promises = Object.keys(this.instances[contractName]).map(async (address) => {
            const changes = await options.mapContractInstancesToProps(contractName, this.instances[contractName][address], passedProps)
            if (changes && Object.keys(changes).length) {
              instanceMappingProps = Object.assign(instanceMappingProps, changes)
            }
          })
          mappingPromises = [...mappingPromises, ...promises]
        })
        await Promise.all(mappingPromises)

        this.instanceMappingProps = instanceMappingProps
      }

    }

    async componentDidMount() {
      try {
        await this.fetchContractsFromProps()
        await this.mapContractInstancesToProps()

        if (options.autoReload && options.autoReload > 0) {
          this.autoReload = setInterval(this.refresh, options.autoReload)
        }

        await this.setState({
          hasLoaded: true
        })
        options.onReady && options.onReady()

      } catch (e) {
        console.error(e)
        this.setState({
          hasErrored: true,
        })
      }
    }

    componentWillUnmount() {
      clearInterval(this.autoReload)
    }

    async refresh() {
      await this.fetchContractsFromProps()
      this.forceUpdate()
    }

    render() {
      if (this.state.hasErrored) {
        return <span>Error</span> // <ChildComponent state={'error'} />
      }

      if (!this.state.hasLoaded) {
        return <span>Loading...</span> // <ChildComponent state={'loading'} />
      }

      const props = {
        account: this.state.account,
        refresh: this.refresh,
        ...this.props,
        ...this.instanceMappingProps,
      }

      props.contracts = { ...this.contracts }
      props.instances = { ...this.instances }
      props.deployed = { ...this.deployed }

      return <ChildComponent
        {...props}
        state={'ready'}
      />
    }
  }
}

export default WithContract